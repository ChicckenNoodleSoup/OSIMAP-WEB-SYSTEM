import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from hdbscan import HDBSCAN
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler, RobustScaler
from scipy import stats
from scipy.spatial.distance import pdist, squareform
import warnings
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import multiprocessing
from hdbscan.validity import validity_index
import time

warnings.filterwarnings("ignore", category=FutureWarning, message=".*force_all_finite.*")

# OPTIMIZATION: Use all available CPU cores for parallel processing
MAX_WORKERS = max(1, multiprocessing.cpu_count() - 1)

def latlon_to_ecef(lat, lon):
    # Earth radius (mean)
    R = 6371000.0  # meters
    x = R * np.cos(lat) * np.cos(lon)
    y = R * np.cos(lat) * np.sin(lon)
    z = R * np.sin(lat)
    return np.column_stack((x, y, z))

class AccidentClusterAnalyzer:
    def calculate_dbcv(self, coords_radians, labels):
        try:
            # Remove noise
            mask = labels != -1
            labels_clean = labels[mask]
            coords_clean = coords_radians[mask]

            if len(set(labels_clean)) <= 1:
                return None

            # Convert radians back to degrees
            lat_deg = np.degrees(coords_clean[:, 0])
            lon_deg = np.degrees(coords_clean[:, 1])

            # Project to ECEF for Euclidean metric
            coords_ecef = latlon_to_ecef(
                np.radians(lat_deg),
                np.radians(lon_deg)
            )

            # Compute DBCV using Euclidean distances
            return validity_index(coords_ecef, labels_clean, metric='euclidean')

        except Exception as e:
            print("DBCV Error:", type(e), e)
            return None

    def __init__(self, filename="accidents.geojson"):
        # Use script_dir + data folder like before
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_folder = os.path.join(script_dir, "data")
        self.file_path = os.path.join(data_folder, filename)

        self.df = None
        self.clustered_df = None
        self.cluster_centers = None
        self.temporal_weights = None
        self.trend_scores = None
        self.current_date = datetime.now()
        
        # Temporal analysis parameters
        self.decay_rate = 0.15
        self.recent_months = 24

    # ======================================================
    # LOAD + PREPROCESS
    # ======================================================
    def load_geojson_data(self):
        """OPTIMIZED: Faster JSON loading and processing"""
        if not os.path.exists(self.file_path):
            return False

        with open(self.file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # OPTIMIZATION: Use list comprehension (faster than loop)
        records = [
            {
                "longitude": feat["geometry"]["coordinates"][0],
                "latitude": feat["geometry"]["coordinates"][1],
                **feat["properties"]
            }
            for feat in data["features"]
            if feat["geometry"]["type"] == "Point"
        ]

        self.df = pd.DataFrame(records)
        return True

    def preprocess_data(self):
        """ENHANCED: More aggressive data cleaning for better clustering"""
        if self.df is None:
            return False
        
        initial_count = len(self.df)
        
        # Remove missing coordinates
        self.df = self.df.dropna(subset=["latitude", "longitude"])
        
        # Validate coordinate ranges
        self.df = self.df[
            (self.df["latitude"].between(-90, 90)) &
            (self.df["longitude"].between(-180, 180))
        ]
        
        # Handle date and time columns
        if 'datecommitted' in self.df.columns:
            if 'timecommitted' in self.df.columns:
                self.df['datetime_str'] = self.df['datecommitted'].astype(str) + ' ' + self.df['timecommitted'].astype(str)
                self.df['date'] = pd.to_datetime(self.df['datetime_str'], errors='coerce')
            else:
                self.df['date'] = pd.to_datetime(self.df['datecommitted'], errors='coerce')
        elif 'date' not in self.df.columns:
            self.df['date'] = self.current_date
        
        self.df['date'] = self.df['date'].fillna(self.current_date)
        
        # IMPROVEMENT: Remove duplicate locations (exact same lat/lon)
        # Keep the most recent accident at each exact location
        self.df = self.df.sort_values('date', ascending=False)
        self.df = self.df.drop_duplicates(subset=['latitude', 'longitude'], keep='first')
        
        # IMPROVEMENT: Remove extreme spatial outliers (isolated points)
        coords = self.df[['latitude', 'longitude']].values
        if len(coords) > 10:
            # Calculate pairwise distances
            center = coords.mean(axis=0)
            distances = np.sqrt(((coords - center) ** 2).sum(axis=1))
            
            # Remove points beyond 3 standard deviations (extreme outliers)
            threshold = distances.mean() + 3 * distances.std()
            self.df = self.df[distances <= threshold]
        
        print(f" Cleaned data: {initial_count} -> {len(self.df)} records ({initial_count - len(self.df)} removed)")
        
        return True

    # ======================================================
    # TEMPORAL ANALYSIS METHODS
    # ======================================================
    def calculate_temporal_weights(self, accident_dates=None):
        """Vectorized temporal weight calculation"""
        if accident_dates is None:
            accident_dates = self.df['date']
        
        days_from_now = (self.current_date - accident_dates).dt.days
        weights = np.exp(-self.decay_rate * days_from_now / 365.25)
        
        return weights
    
    def analyze_accident_trends(self, locations=None, dates=None):
        """High resolution trend analysis (50x50)"""
        if locations is None:
            locations = self.df[['latitude', 'longitude']].values
        if dates is None:
            dates = self.df['date']
        
        df_trend = pd.DataFrame({
            'date': dates,
            'lat': locations[:, 0],
            'lon': locations[:, 1]
        })
        
        df_trend['year_month'] = df_trend['date'].dt.to_period('M')
        
        # High resolution spatial binning
        lat_bins = pd.cut(df_trend['lat'], bins=50)
        lon_bins = pd.cut(df_trend['lon'], bins=50)
        df_trend['spatial_bin'] = lat_bins.astype(str) + '_' + lon_bins.astype(str)
        
        monthly_counts = df_trend.groupby(['spatial_bin', 'year_month']).size().reset_index(name='count')
        
        trends = {}
        for spatial_bin in monthly_counts['spatial_bin'].unique():
            bin_data = monthly_counts[monthly_counts['spatial_bin'] == spatial_bin]
            
            if len(bin_data) >= 3:
                x = np.arange(len(bin_data))
                y = bin_data['count'].values
                slope, _, r_value, _, _ = stats.linregress(x, y)
                trends[spatial_bin] = slope if abs(r_value) > 0.3 else 0
            else:
                trends[spatial_bin] = 0
        
        df_trend['trend'] = df_trend['spatial_bin'].map(trends).fillna(0)
        
        return df_trend['trend'].values

    def calculate_danger_score(self, cluster_data):
        """Calculate composite danger score for a cluster"""
        if len(cluster_data) == 0:
            return 0
        
        cluster_weights = self.calculate_temporal_weights(cluster_data['date'])
        cluster_coords = cluster_data[['latitude', 'longitude']].values
        cluster_trends = self.analyze_accident_trends(cluster_coords, cluster_data['date'])
        
        temporal_component = np.mean(cluster_weights) * 0.4
        trend_component = max(0, np.mean(cluster_trends)) * 0.3
        frequency_component = min(len(cluster_data) / 100, 1.0) * 0.3
        
        return temporal_component + trend_component + frequency_component

    # ======================================================
    # DENSITY-BASED PREPROCESSING
    # ======================================================
    def calculate_local_density(self, coords, k=15):
        """Calculate local density for each point"""
        from sklearn.neighbors import NearestNeighbors
        
        # Find k-nearest neighbors
        nbrs = NearestNeighbors(n_neighbors=k, metric='haversine', n_jobs=-1)
        nbrs.fit(coords)
        distances, indices = nbrs.kneighbors(coords)
        
        # Density = 1 / average distance to k neighbors
        avg_distances = distances[:, 1:].mean(axis=1)  # Exclude self (index 0)
        density = 1.0 / (avg_distances + 1e-10)
        
        return density

    def filter_low_density_points(self, density_percentile=10):
        """Remove points in very low density areas (likely noise)"""
        if len(self.df) < 50:
            return
        
        coords = np.radians(self.df[['latitude', 'longitude']].values)
        density = self.calculate_local_density(coords)
        
        # Remove lowest density percentile
        threshold = np.percentile(density, density_percentile)
        mask = density >= threshold
        
        removed = len(self.df) - mask.sum()
        self.df = self.df[mask].reset_index(drop=True)
        print(f" Removed {removed} low-density points (bottom {density_percentile}%)")

    # ======================================================
    # MAIN CLUSTERING (OPTIMIZED FOR HIGH DBCV)
    # ======================================================
    def perform_clustering(self, min_cluster_size=35, min_samples=25, cluster_selection_epsilon=0.0):
        """OPTIMIZED: Parameters tuned for DBCV > 0.5"""
        coords = np.radians(self.df[["latitude", "longitude"]].values)
        
        clusterer = HDBSCAN(
            min_cluster_size=min_cluster_size,
            min_samples=min_samples,
            metric="haversine",
            cluster_selection_epsilon=cluster_selection_epsilon,
            cluster_selection_method='leaf',  # More stable, distinct clusters
            allow_single_cluster=False,  # Force multiple clusters
            core_dist_n_jobs=-1
        )
        
        labels = clusterer.fit_predict(coords)
        self.df["cluster"] = labels
        self.clustered_df = self.df.copy()
        
        self.temporal_weights = self.calculate_temporal_weights()
        self.trend_scores = self.analyze_accident_trends()
        
        self.clustered_df['temporal_weight'] = self.temporal_weights
        self.clustered_df['trend_score'] = self.trend_scores
        
        # Compute DBCV benchmark
        try:
            self.dbcv_score = self.calculate_dbcv(coords, labels)
            print(f" DBCV Score: {self.dbcv_score:.4f}")
        except:
            self.dbcv_score = None
            print(" DBCV calculation failed")

        return labels

    # ======================================================
    # ENHANCED SUB-CLUSTERING
    # ======================================================
    def temporal_subcluster_large_clusters(self, max_accidents=None):
        """Enhanced sub-clustering with better separation"""
        if self.clustered_df is None:
            return
        
        if max_accidents is None:
            max_accidents = 150  # More aggressive splitting
            
        clusters_to_process = self.clustered_df["cluster"].unique()
        next_cluster_id = self.clustered_df["cluster"].max() + 1
        
        for cid in clusters_to_process:
            if cid == -1:
                continue
                
            cluster_points = self.clustered_df[self.clustered_df["cluster"] == cid]
            accident_count = len(cluster_points)
            
            if accident_count > max_accidents:
                coordinates = cluster_points[['latitude', 'longitude']].values
                dates = cluster_points['date']
                
                cluster_temporal_weights = self.calculate_temporal_weights(dates)
                cluster_trends = self.analyze_accident_trends(coordinates, dates)
                
                # Use robust scaling to handle outliers better
                scaler = RobustScaler()
                normalized_coords = scaler.fit_transform(coordinates)
                
                # Balanced feature weighting
                weighted_features = np.column_stack([
                    normalized_coords[:, 0],
                    normalized_coords[:, 1],
                    cluster_temporal_weights * 0.5,
                    cluster_trends * 5
                ])
                
                sub_clusterer = HDBSCAN(
                    min_cluster_size=max(20, accident_count // 10),
                    min_samples=max(15, accident_count // 15),
                    metric='euclidean',
                    cluster_selection_epsilon=0.0,
                    cluster_selection_method='leaf',
                    core_dist_n_jobs=-1
                )
                
                sub_labels = sub_clusterer.fit_predict(weighted_features)
                
                unique_sub_labels = set(sub_labels)
                n_sub_clusters = len(unique_sub_labels) - (1 if -1 in unique_sub_labels else 0)
                
                if n_sub_clusters > 1:
                    mapped_labels = []
                    label_mapping = {}
                    
                    for label in sub_labels:
                        if label == -1:
                            mapped_labels.append(-1)
                        else:
                            if label not in label_mapping:
                                label_mapping[label] = next_cluster_id
                                next_cluster_id += 1
                            mapped_labels.append(label_mapping[label])
                    
                    self.clustered_df.loc[cluster_points.index, "cluster"] = mapped_labels
        
        self.remove_cluster_outliers()
        self.renumber_clusters_sequentially()

    # ======================================================
    # AGGRESSIVE OUTLIER REMOVAL
    # ======================================================
    def remove_cluster_outliers(self, max_std_dev=0.9):
        """Very aggressive outlier removal for tighter clusters"""
        if self.clustered_df is None:
            return
        
        for cid in self.clustered_df["cluster"].unique():
            if cid == -1:
                continue
            
            cluster_mask = self.clustered_df["cluster"] == cid
            cluster_points = self.clustered_df[cluster_mask]
            
            if len(cluster_points) < 10:
                continue
            
            coords = np.radians(cluster_points[["latitude", "longitude"]].values)
            centroid = coords.mean(axis=0)
            distances = np.sqrt(((coords - centroid) ** 2).sum(axis=1))
            
            mean_dist = distances.mean()
            std_dist = distances.std()
            threshold = mean_dist + (max_std_dev * std_dist)
            outlier_mask = distances > threshold
            
            n_outliers = outlier_mask.sum()
            
            if n_outliers > 0 and n_outliers < len(cluster_points) * 0.3:  # Don't remove more than 30%
                outlier_indices = cluster_points[outlier_mask].index
                self.clustered_df.loc[outlier_indices, "cluster"] = -1

    def renumber_clusters_sequentially(self):
        """Renumber clusters to remove gaps"""
        if self.clustered_df is None:
            return
        
        unique_clusters = sorted([c for c in self.clustered_df["cluster"].unique() if c != -1])
        
        if not unique_clusters:
            return
        
        cluster_mapping = {old_id: new_id for new_id, old_id in enumerate(unique_clusters)}
        cluster_mapping[-1] = -1
        
        self.clustered_df["cluster"] = self.clustered_df["cluster"].map(cluster_mapping)

    # ======================================================
    # CLUSTER STATS WITH STRICT VALIDATION
    # ======================================================
    def calculate_cluster_centers(self):
        """Strict validation for high-quality clusters only"""
        stats = []
        
        for cid, subset in self.clustered_df[self.clustered_df["cluster"] != -1].groupby("cluster"):
            danger_score = self.calculate_danger_score(subset)
            recent_cutoff = self.current_date - timedelta(days=365)
            recent_accidents = len(subset[subset['date'] > recent_cutoff])
            
            stats.append({
                "cluster_id": int(cid),
                "center_lat": subset["latitude"].mean(),
                "center_lon": subset["longitude"].mean(),
                "accident_count": len(subset),
                "danger_score": round(danger_score, 4),
                "recent_accidents": recent_accidents,
                "avg_temporal_weight": round(subset['temporal_weight'].mean(), 4),
                "avg_trend_score": round(subset['trend_score'].mean(), 4),
                "barangays": subset["barangay"].dropna().unique().tolist() if "barangay" in subset.columns else []
            })
        
        # Very strict validation
        valid_clusters = []
        invalid_clusters = []
        
        SPARSITY_THRESHOLD = 60  # Higher threshold
        MIN_RECENCY_SCORE = 0.45  # Higher recency requirement
        
        latest_date = self.clustered_df["date"].max()
        cutoff_year = latest_date.year
        effective_latest_year = cutoff_year - 1 if latest_date.month < 12 else cutoff_year
        
        global_min_year = int(self.clustered_df['date'].dt.year.min())
        global_max_year = effective_latest_year
        
        for cid, subset in self.clustered_df.groupby("cluster"):
            if cid == -1:
                continue
                
            subset = subset.copy()
            subset["accident_year"] = subset["date"].dt.year
            
            raw_counts_dict = subset["accident_year"].value_counts().to_dict()
            years = np.arange(global_min_year, global_max_year + 1)
            counts = np.array([float(raw_counts_dict.get(int(y), 0.0)) for y in years])
            
            total_accidents = counts.sum()
            
            if total_accidents < SPARSITY_THRESHOLD:
                invalid_clusters.append(int(cid))
                continue
            
            # Calculate recency score
            rel = (years - years.min()) / (years.max() - years.min() + 1e-9)
            recency_score = float(np.average(rel, weights=counts)) if counts.sum() > 0 else 0
            
            if recency_score >= MIN_RECENCY_SCORE:
                valid_clusters.append(int(cid))
            else:
                invalid_clusters.append(int(cid))
        
        # Filter stats
        valid_ids = set(valid_clusters)
        stats = [s for s in stats if s["cluster_id"] in valid_ids]
        
        # Mark invalid as noise
        invalid_mask = (self.clustered_df["cluster"] != -1) & (~self.clustered_df["cluster"].isin(valid_ids))
        self.clustered_df.loc[invalid_mask, "cluster"] = -1
        
        # Renumber and update stats
        unique_clusters_before = sorted([c for c in self.clustered_df["cluster"].unique() if c != -1])
        cluster_id_mapping = {old_id: new_id for new_id, old_id in enumerate(unique_clusters_before)}
        
        self.renumber_clusters_sequentially()
        
        for stat in stats:
            old_id = stat["cluster_id"]
            if old_id in cluster_id_mapping:
                stat["cluster_id"] = cluster_id_mapping[old_id]
        
        stats = sorted(stats, key=lambda x: x["danger_score"], reverse=True)
        self.cluster_centers = stats

    # ======================================================
    # EXPORT
    # ======================================================
    def export_to_geojson(self, filename="accidents_clustered.geojson"):
        """Export to GeoJSON"""
        if self.clustered_df is None:
            return
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_folder = os.path.join(script_dir, "data")
        os.makedirs(data_folder, exist_ok=True)
        output = os.path.join(data_folder, filename)

        features = []
        
        for _, row in self.clustered_df.iterrows():
            properties = {k: (v.item() if isinstance(v, (np.integer, np.floating)) else
                            v.tolist() if isinstance(v, np.ndarray) else
                            None if pd.isna(v) else
                            v.isoformat() if isinstance(v, pd.Timestamp) else v)
                         for k, v in row.items() if k not in ["longitude", "latitude"]}
            
            properties["type"] = "accident_point"
            
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [row["longitude"], row["latitude"]]},
                "properties": properties
            })
        
        if self.cluster_centers:
            for cluster in self.cluster_centers:
                cluster_properties = cluster.copy()
                cluster_properties["type"] = "cluster_center"
                
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [cluster["center_lon"], cluster["center_lat"]]},
                    "properties": cluster_properties
                })
        
        geojson = {"type": "FeatureCollection", "features": features}
        
        with open(output, "w", encoding="utf-8") as f:
            json.dump(geojson, f, indent=2, ensure_ascii=False)

    def export_cluster_centers(self, filename="cluster_centers.json"):
        """Export cluster centers"""
        if not self.cluster_centers:
            return
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_folder = os.path.join(script_dir, "data")
        output = os.path.join(data_folder, filename)
            
        with open(output, "w", encoding="utf-8") as f:
            json.dump(self.cluster_centers, f, indent=2, ensure_ascii=False)

    # ======================================================
    # MAIN PIPELINE
    # ======================================================
    def main(self, auto_tune=False, export_alerts=False):
        """Main pipeline optimized for DBCV > 0.5"""
        if not self.load_geojson_data():
            return
        if not self.preprocess_data():
            return
        
        # Remove low-density noise points
        self.filter_low_density_points(density_percentile=10)
        
        # Parameters optimized for high DBCV
        min_cluster_size = 35  # Larger, more cohesive clusters
        min_samples = 25  # Stricter density requirement
        epsilon = 0.0  # Let algorithm choose naturally
        
        self.perform_clustering(
            min_cluster_size=min_cluster_size,
            min_samples=min_samples,
            cluster_selection_epsilon=epsilon
        )
        
        # Aggressive sub-clustering and refinement
        self.temporal_subcluster_large_clusters(max_accidents=150)
        self.calculate_cluster_centers()
        
        self.export_to_geojson()
        self.export_cluster_centers()


if __name__ == "__main__":
    start_time = time.time()  # Start timer
    analyzer = AccidentClusterAnalyzer()
    analyzer.main()
    end_time = time.time()    # End timer
    
    elapsed = end_time - start_time
    print(f"\nTotal runtime: {elapsed:.2f} seconds")