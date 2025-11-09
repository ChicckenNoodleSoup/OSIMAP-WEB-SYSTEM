import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from hdbscan import HDBSCAN
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler
from scipy import stats
import warnings

warnings.filterwarnings("ignore", category=FutureWarning, message=".*force_all_finite.*")


class AccidentClusterAnalyzer:
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
        # Dynamic sub-clustering threshold based on dataset size
        # Will be set after data is loaded

    # ======================================================
    # LOAD + PREPROCESS
    # ======================================================
    def load_geojson_data(self):
        if not os.path.exists(self.file_path):
            print(f" GeoJSON not found: {self.file_path}")
            return False

        print(f" Loading accidents from {self.file_path}...")
        with open(self.file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = []
        for feat in data["features"]:
            if feat["geometry"]["type"] != "Point":
                continue
            coords = feat["geometry"]["coordinates"]
            props = feat["properties"]
            records.append({
                "longitude": coords[0],
                "latitude": coords[1],
                **props
            })

        self.df = pd.DataFrame(records)
        print(f" Loaded {len(self.df)} accident records")
        return True

    def preprocess_data(self):
        if self.df is None:
            return False
        before = len(self.df)
        self.df = self.df.dropna(subset=["latitude", "longitude"])
        self.df = self.df[
            (self.df["latitude"].between(-90, 90)) &
            (self.df["longitude"].between(-180, 180))
        ]
        
        # Handle date and time columns - combine datecommitted and timecommitted
        if 'datecommitted' in self.df.columns:
            if 'timecommitted' in self.df.columns:
                # Combine date and time
                self.df['datetime_str'] = self.df['datecommitted'].astype(str) + ' ' + self.df['timecommitted'].astype(str)
                try:
                    self.df['date'] = pd.to_datetime(self.df['datetime_str'], errors='coerce')
                except:
                    self.df['date'] = pd.to_datetime(self.df['datecommitted'], errors='coerce')
            else:
                # Just use datecommitted
                self.df['date'] = pd.to_datetime(self.df['datecommitted'], errors='coerce')
        elif 'date' not in self.df.columns:
            print(" No datecommitted column found. Adding current date for all records.")
            self.df['date'] = self.current_date
        
        # Fill NaT values with current date
        self.df['date'] = self.df['date'].fillna(self.current_date)
        
        after = len(self.df)
        print(f"  Cleaned {before - after} invalid records {after} remain")
        return True

    # ======================================================
    # TEMPORAL ANALYSIS METHODS
    # ======================================================
    def calculate_temporal_weights(self, accident_dates=None):
        """Calculate exponential decay weights based on accident dates"""
        if accident_dates is None:
            accident_dates = self.df['date']
        
        # Calculate days from current date
        days_from_now = (self.current_date - accident_dates).dt.days
        
        # Apply exponential decay: weight = exp(-decay_rate * days_from_now / 365)
        weights = np.exp(-self.decay_rate * days_from_now / 365.25)
        
        return weights
    
    def analyze_accident_trends(self, locations=None, dates=None):
        """Analyze accident trends using linear regression on time series"""
        if locations is None:
            locations = self.df[['latitude', 'longitude']].values
        if dates is None:
            dates = self.df['date']
        
        # Create DataFrame for analysis
        df_trend = pd.DataFrame({
            'date': dates,
            'lat': locations[:, 0],
            'lon': locations[:, 1]
        })
        
        # Group by location bins and month to count accidents
        df_trend['year_month'] = df_trend['date'].dt.to_period('M')
        
        # Create spatial bins (adjust bin size based on your coordinate system)
        lat_bins = pd.cut(df_trend['lat'], bins=50)
        lon_bins = pd.cut(df_trend['lon'], bins=50)
        df_trend['spatial_bin'] = lat_bins.astype(str) + '_' + lon_bins.astype(str)
        
        # Count accidents per spatial bin per month
        monthly_counts = df_trend.groupby(['spatial_bin', 'year_month']).size().reset_index(name='count')
        
        # Calculate trend for each spatial bin
        trends = {}
        for spatial_bin in monthly_counts['spatial_bin'].unique():
            bin_data = monthly_counts[monthly_counts['spatial_bin'] == spatial_bin]
            
            if len(bin_data) >= 3:  # Need minimum points for trend
                # Convert period to numeric for regression
                x = np.arange(len(bin_data))
                y = bin_data['count'].values
                
                # Calculate linear trend (slope)
                slope, _, r_value, _, _ = stats.linregress(x, y)
                trends[spatial_bin] = slope if abs(r_value) > 0.3 else 0  # Only significant trends
            else:
                trends[spatial_bin] = 0
        
        # Map trends back to original data points
        df_trend['trend'] = df_trend['spatial_bin'].map(trends).fillna(0)
        
        return df_trend['trend'].values

    def calculate_danger_score(self, cluster_data):
        """Calculate composite danger score for a cluster"""
        if len(cluster_data) == 0:
            return 0
        
        # Get temporal weights and trends for this cluster
        cluster_weights = self.calculate_temporal_weights(cluster_data['date'])
        cluster_coords = cluster_data[['latitude', 'longitude']].values
        cluster_trends = self.analyze_accident_trends(cluster_coords, cluster_data['date'])
        
        # Calculate components
        temporal_component = np.mean(cluster_weights) * 0.4  # 40% weight
        trend_component = max(0, np.mean(cluster_trends)) * 0.3  # 30% weight (only positive trends)
        frequency_component = min(len(cluster_data) / 100, 1.0) * 0.3  # 30% weight (capped at 100)
        
        return temporal_component + trend_component + frequency_component

    # ======================================================
    # FAST SILHOUETTE
    # ======================================================
    def fast_silhouette(self, X, labels, sample_size=2000):
        if len(set(labels)) <= 1:
            return None
        mask = np.random.choice(len(X), min(sample_size, len(X)), replace=False)
        try:
            return silhouette_score(X[mask], labels[mask], metric="haversine")
        except Exception:
            return None

    # ======================================================
    # AUTO-TUNING (optimized for tight geographical clusters)
    # ======================================================
    def tune_clustering(self,
                        cluster_sizes=[5, 10, 20, 30, 50],
                        epsilons=[0.000001, 0.000005, 0.00001, 0.00005]):
        if self.df is None:
            return None
        coords = np.radians(self.df[["latitude", "longitude"]].values)
        n_points = len(coords)
        results = []

        # For accident data, we want TIGHT but MERGEABLE geographical clusters
        # epsilon in radians: 0.00001 rad ≈ 640m, 0.000001 rad ≈ 64m
        # Scale parameters with dataset size
        print(f"Dataset size: {n_points} points")
        
        # Calculate dynamic sub-clustering threshold (scales with dataset size)
        # Rule: ~3-4% of total accidents per cluster before sub-clustering
        self.highway_cluster_threshold = max(300, int(n_points * 0.035))
        print(f"Dynamic sub-cluster threshold: {self.highway_cluster_threshold} accidents")
        
        if n_points < 100:
            cluster_sizes = [3, 5, 8]
            epsilons = [0.0000001, 0.0000005, 0.000001]  # ~6m, ~32m, ~64m (NO ZERO!)
        elif n_points < 500:
            cluster_sizes = [5, 8, 10, 15]
            epsilons = [0.0000005, 0.000001, 0.000002]   # ~32m, ~64m, ~128m
        elif n_points < 2000:
            cluster_sizes = [8, 12, 15, 20]
            epsilons = [0.0000005, 0.000001, 0.000002, 0.000003]  # ~32m, ~64m, ~128m, ~192m
        elif n_points < 5000:
            cluster_sizes = [10, 15, 20, 25]
            epsilons = [0.000001, 0.000002, 0.000003, 0.000004]   # ~64m, ~128m, ~192m, ~256m
        elif n_points < 10000:
            cluster_sizes = [15, 20, 28, 35]
            epsilons = [0.000001, 0.000002, 0.000003, 0.000005]   # ~64m, ~128m, ~192m, ~320m
        else:
            # Very large dataset (13k+ or future 20k+ records)
            # Balance between intersection-level clusters and merging nearby hotspots
            cluster_sizes = [15, 22, 30, 40]  # Smaller min allows intersections to form clusters
            epsilons = [0.000002, 0.000004, 0.000006, 0.000008]   # ~128m, ~256m, ~384m, ~512m (MORE MERGING)
            print(f"Using large dataset parameters (balanced merging + intersections)")

        print("\n=== PARAMETER TUNING (Tight Clusters) ===")
        for size in cluster_sizes:
            for eps in epsilons:
                clusterer = HDBSCAN(
                    min_cluster_size=size,
                    min_samples=max(3, size // 3),  # Increased min_samples for tighter clusters
                    metric="haversine",
                    cluster_selection_epsilon=eps
                )
                labels = clusterer.fit_predict(coords)
                n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
                n_noise = list(labels).count(-1)
                noise_ratio = n_noise / len(labels) if len(labels) > 0 else 0
                silhouette = self.fast_silhouette(coords, labels) if n_clusters > 1 else None
                
                # Calculate average cluster compactness (lower is tighter)
                avg_compactness = 0
                if n_clusters > 0:
                    compactness_scores = []
                    for cid in set(labels):
                        if cid == -1:
                            continue
                        cluster_mask = labels == cid
                        cluster_coords = coords[cluster_mask]
                        if len(cluster_coords) > 1:
                            # Calculate spread as max distance from centroid
                            centroid = cluster_coords.mean(axis=0)
                            distances = np.sqrt(((cluster_coords - centroid) ** 2).sum(axis=1))
                            compactness_scores.append(distances.max())
                    avg_compactness = np.mean(compactness_scores) if compactness_scores else 0
                
                results.append({
                    "min_cluster_size": size,
                    "min_samples": max(3, size // 3),
                    "epsilon": eps,
                    "clusters": n_clusters,
                    "noise_ratio": round(noise_ratio, 3),
                    "silhouette": silhouette,
                    "compactness": round(avg_compactness, 6)
                })
                print(f"size={size}, samples={max(3, size // 3)}, eps={eps:.7f}  "
                      f"clusters={n_clusters}, noise={round(noise_ratio, 3)}, "
                      f"s={silhouette}, compact={round(avg_compactness, 6)}")

        # Prioritize: good silhouette > reasonable cluster count > acceptable noise > compactness
        # We want to balance quality with sensible merging of nearby clusters
        results = sorted(results,
                         key=lambda x: (
                             (x["silhouette"] is not None),                    # Has valid silhouette
                             x["silhouette"] if x["silhouette"] else -1,       # Higher silhouette (quality)
                             x["clusters"] > 20,                                # Has reasonable number of clusters
                             x["noise_ratio"] < 0.35,                          # Acceptable noise level
                             x["epsilon"] > 0.000001,                          # Prefer some merging over none
                             -x["clusters"],                                    # Prefer fewer clusters (merge nearby)
                             -x["compactness"]                                  # Tighter is better (but lower priority)
                         ),
                         reverse=True)
        
        best = results[0]
        print(f"\nBest params: size={best['min_cluster_size']}, samples={best['min_samples']}, "
              f"eps={best['epsilon']:.7f}, clusters={best['clusters']}, "
              f"noise={best['noise_ratio']}, silhouette={best['silhouette']}, compactness={best['compactness']}")
        return best

    # ======================================================
    # MAIN CLUSTERING
    # ======================================================
    def perform_clustering(self, min_cluster_size=15, min_samples=5, cluster_selection_epsilon=0.0001):
        coords = np.radians(self.df[["latitude", "longitude"]].values)
        clusterer = HDBSCAN(
            min_cluster_size=min_cluster_size,
            min_samples=min_samples,
            metric="haversine",
            cluster_selection_epsilon=cluster_selection_epsilon
        )
        labels = clusterer.fit_predict(coords)
        self.df["cluster"] = labels
        self.clustered_df = self.df.copy()
        
        # Calculate temporal weights and trends for all data
        print(" Calculating temporal weights and trends...")
        self.temporal_weights = self.calculate_temporal_weights()
        self.trend_scores = self.analyze_accident_trends()
        
        # Add to dataframe
        self.clustered_df['temporal_weight'] = self.temporal_weights
        self.clustered_df['trend_score'] = self.trend_scores
        
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        print(f" HDBSCAN  {n_clusters} clusters, {list(labels).count(-1)} noise")
        return labels

    # ======================================================
    # SPREAD CALC
    # ======================================================
    def cluster_spatial_spread(self, cluster_points):
        if len(cluster_points) < 2:
            return 0
        lat_range = cluster_points["latitude"].max() - cluster_points["latitude"].min()
        lon_range = cluster_points["longitude"].max() - cluster_points["longitude"].min()
        return max(lat_range, lon_range) * 111_000  # approx meters

    # ======================================================
    # ENHANCED SUB-CLUSTERING WITH TEMPORAL WEIGHTING
    # ======================================================
    def temporal_subcluster_large_clusters(self, max_accidents=None):
        """Enhanced sub-clustering that uses temporal weighting for large clusters"""
        if self.clustered_df is None:
            return
        
        if max_accidents is None:
            # Use dynamic threshold if set, otherwise fallback to reasonable default
            max_accidents = getattr(self, 'highway_cluster_threshold', 500)
            
        print(f"\n Temporal sub-clustering for clusters > {max_accidents} accidents...")
        clusters_to_process = self.clustered_df["cluster"].unique()

        next_cluster_id = self.clustered_df["cluster"].max() + 1
        subclustered_count = 0
        
        for cid in clusters_to_process:
            if cid == -1:
                continue
                
            cluster_points = self.clustered_df[self.clustered_df["cluster"] == cid]
            accident_count = len(cluster_points)
            
            should_subcluster = accident_count > max_accidents
            
            if should_subcluster:
                print(f"  Sub-clustering Cluster {cid} ({accident_count} accidents)")
                subclustered_count += 1
                
                # Extract coordinates and temporal data
                coordinates = cluster_points[['latitude', 'longitude']].values
                dates = cluster_points['date']
                
                # Calculate temporal weights for this cluster
                cluster_temporal_weights = self.calculate_temporal_weights(dates)
                cluster_trends = self.analyze_accident_trends(coordinates, dates)
                
                # Normalize coordinates
                scaler = StandardScaler()
                normalized_coords = scaler.fit_transform(coordinates)
                
                # Create weighted features combining spatial and temporal information
                weighted_features = np.column_stack([
                    normalized_coords[:, 0] * cluster_temporal_weights,  # Weighted latitude
                    normalized_coords[:, 1] * cluster_temporal_weights,  # Weighted longitude
                    cluster_temporal_weights,  # Temporal weight as feature
                    cluster_trends * 10   # Trend scores (scaled up for importance)
                ])
                
                # Apply HDBSCAN for sub-clustering
                sub_clusterer = HDBSCAN(
                    min_cluster_size=max(10, accident_count // 20),  # Adaptive cluster size
                    min_samples=max(5, accident_count // 40),
                    metric='euclidean',
                    cluster_selection_epsilon=0.1
                )
                
                sub_labels = sub_clusterer.fit_predict(weighted_features)
                
                # Map sub-cluster labels to new cluster IDs
                unique_sub_labels = set(sub_labels)
                n_sub_clusters = len(unique_sub_labels) - (1 if -1 in unique_sub_labels else 0)
                
                if n_sub_clusters > 1:  # Only apply if we actually got sub-clusters
                    mapped_labels = []
                    label_mapping = {}
                    
                    for label in sub_labels:
                        if label == -1:
                            mapped_labels.append(-1)  # Keep noise as noise
                        else:
                            if label not in label_mapping:
                                label_mapping[label] = next_cluster_id
                                next_cluster_id += 1
                            mapped_labels.append(label_mapping[label])
                    
                    # Update cluster assignments
                    self.clustered_df.loc[cluster_points.index, "cluster"] = mapped_labels
                    print(f"       Split into {n_sub_clusters} sub-clusters")
                else:
                    print(f"        No meaningful sub-clusters found, keeping original")

        print(f" Sub-clustered {subclustered_count} large clusters")
        
        # Remove outlier points from clusters
        self.remove_cluster_outliers()
        
        # Renumber clusters to remove gaps
        self.renumber_clusters_sequentially()

    # ======================================================
    # REMOVE CLUSTER OUTLIERS (Prevents chaining effect)
    # ======================================================
    def remove_cluster_outliers(self, max_std_dev=1.2):
        """Remove outlier points from clusters that are too far from cluster core"""
        if self.clustered_df is None:
            return
        
        print("\n Removing outlier points from clusters...")
        
        total_removed = 0
        
        for cid in self.clustered_df["cluster"].unique():
            if cid == -1:
                continue
            
            cluster_mask = self.clustered_df["cluster"] == cid
            cluster_points = self.clustered_df[cluster_mask]
            
            if len(cluster_points) < 5:
                continue  # Skip very small clusters
            
            # Calculate cluster centroid
            coords = np.radians(cluster_points[["latitude", "longitude"]].values)
            centroid = coords.mean(axis=0)
            
            # Calculate distances from centroid
            distances = np.sqrt(((coords - centroid) ** 2).sum(axis=1))
            
            # Calculate mean and std dev of distances
            mean_dist = distances.mean()
            std_dist = distances.std()
            
            # Mark points beyond threshold as outliers
            # Use max_std_dev * std_dev from mean as threshold
            threshold = mean_dist + (max_std_dev * std_dist)
            outlier_mask = distances > threshold
            
            n_outliers = outlier_mask.sum()
            
            if n_outliers > 0:
                # Convert outliers to noise
                outlier_indices = cluster_points[outlier_mask].index
                self.clustered_df.loc[outlier_indices, "cluster"] = -1
                total_removed += n_outliers
                
                max_dist_m = int(distances.max() * 6371000)  # Convert to meters
                print(f"   Cluster {cid}: Removed {n_outliers} outliers (max distance was {max_dist_m}m)")
        
        print(f"Removed {total_removed} outlier points total")

    # ======================================================
    # RENUMBER CLUSTERS
    # ======================================================
    def renumber_clusters_sequentially(self):
        """Renumber clusters to remove gaps (0, 1, 2, ..., n) after sub-clustering"""
        if self.clustered_df is None:
            return
        
        print("\nRenumbering clusters sequentially...")
        
        # Get unique cluster IDs (excluding noise)
        unique_clusters = sorted([c for c in self.clustered_df["cluster"].unique() if c != -1])
        
        if not unique_clusters:
            print("   No clusters to renumber")
            return
        
        # Create mapping from old IDs to new sequential IDs
        cluster_mapping = {old_id: new_id for new_id, old_id in enumerate(unique_clusters)}
        cluster_mapping[-1] = -1  # Keep noise as -1
        
        # Remap cluster IDs
        self.clustered_df["cluster"] = self.clustered_df["cluster"].map(cluster_mapping)
        
        print(f"   Renumbered {len(unique_clusters)} clusters: 0-{len(unique_clusters)-1}")

    # Legacy method for backward compatibility
    def subcluster_large_clusters(self, max_accidents=500, max_spread_m=300):
        """Enhanced sub-clustering method that uses temporal weighting"""
        self.temporal_subcluster_large_clusters(max_accidents)

    # ======================================================
    # ENHANCED CLUSTER STATS WITH DANGER SCORING
    # ======================================================
    def calculate_cluster_centers(self):
        """Calculate cluster centers with enhanced danger scoring and validation"""
        stats = []
        invalid_clusters = []
        
        for cid in self.clustered_df["cluster"].unique():
            if cid == -1:
                continue
                
            subset = self.clustered_df[self.clustered_df["cluster"] == cid]
            cluster_size = len(subset)
            
            # VALIDATION: Check cluster spatial spread
            if cluster_size > 1:
                coords = np.radians(subset[["latitude", "longitude"]].values)
                centroid = coords.mean(axis=0)
                distances = np.sqrt(((coords - centroid) ** 2).sum(axis=1))
                max_spread = distances.max()
                
                # Flag clusters that are too spread out (> 0.0015 radians = ~96m from center)
                # This catches visually "spread out" clusters
                if max_spread > 0.0015:
                    invalid_clusters.append({
                        "id": int(cid),
                        "size": cluster_size,
                        "spread_m": int(max_spread * 6371000)  # Convert to meters
                    })
            
            danger_score = self.calculate_danger_score(subset)
            
            # Calculate recent accidents (last 12 months)
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
        
        # Report overly spread clusters
        if invalid_clusters:
            print(f"\n{'='*60}")
            print(f" QUALITY WARNING: Found {len(invalid_clusters)} overly spread clusters (>96m radius)")
            print(f"{'='*60}")
            for ic in invalid_clusters[:10]:  # Show first 10
                print(f"   Cluster #{ic['id']}: {ic['size']} accidents, radius {ic['spread_m']}m")
            if len(invalid_clusters) > 10:
                print(f"   ... and {len(invalid_clusters) - 10} more")
            print(f"{'='*60}\n")
            
        # Sort by danger score (most dangerous first)
        stats = sorted(stats, key=lambda x: x["danger_score"], reverse=True)
        self.cluster_centers = stats

    def get_alert_worthy_clusters(self, threshold_percentile=20):
        """Get clusters that should trigger mobile app alerts"""
        if not self.cluster_centers:
            return []
        
        # Calculate danger score threshold
        danger_scores = [c["danger_score"] for c in self.cluster_centers]
        threshold = np.percentile(danger_scores, 100 - threshold_percentile)
        
        # Filter clusters above threshold
        alert_clusters = [c for c in self.cluster_centers if c["danger_score"] >= threshold]
        
        print(f"\n Alert-worthy clusters (top {threshold_percentile}%):")
        print(f"   Danger score threshold: {threshold:.4f}")
        print(f"   Number of alert clusters: {len(alert_clusters)}")
        
        return alert_clusters

    def generate_mobile_alert_data(self, alert_clusters=None, radius_km=0.5):
        """Generate data structure for mobile app alerts"""
        if alert_clusters is None:
            alert_clusters = self.get_alert_worthy_clusters()
        
        alert_data = []
        
        for cluster in alert_clusters:
            # Categorize danger level
            danger_score = cluster['danger_score']
            if danger_score >= 0.7:
                danger_level = 'HIGH'
            elif danger_score >= 0.4:
                danger_level = 'MEDIUM'
            else:
                danger_level = 'LOW'
            
            # Generate alert message
            trend_text = "with increasing accidents" if cluster['avg_trend_score'] > 0.1 else ""
            recent_text = f"{cluster['recent_accidents']} recent accidents" if cluster['recent_accidents'] > 0 else ""
            alert_message = f"Accident-prone area ahead {trend_text}. {recent_text} reported here. Drive carefully."
            
            alert_info = {
                'cluster_id': cluster['cluster_id'],
                'center_lat': float(cluster['center_lat']),
                'center_lon': float(cluster['center_lon']),
                'radius_km': radius_km,
                'danger_level': danger_level,
                'danger_score': cluster['danger_score'],
                'accident_count': cluster['accident_count'],
                'recent_accidents': cluster['recent_accidents'],
                'trend': 'increasing' if cluster['avg_trend_score'] > 0.1 else 'stable',
                'alert_message': alert_message
            }
            alert_data.append(alert_info)
        
        return alert_data

    def get_cluster_summary(self):
        """Enhanced cluster summary with danger scoring"""
        if self.clustered_df is None:
            return
            
        print("\n=== ENHANCED CLUSTER SUMMARY ===")
        print(f"Total accidents: {len(self.clustered_df)}")
        print(f"Clusters: {len([c for c in self.clustered_df['cluster'].unique() if c != -1])}")
        print(f"Noise: {len(self.clustered_df[self.clustered_df['cluster'] == -1])}")
        
        print(f"\nTop 10 most dangerous clusters:")
        for i, c in enumerate(self.cluster_centers[:10], 1):
            print(f" {i:2d}. Cluster {c['cluster_id']}: {c['accident_count']} accidents, "
                  f"danger={c['danger_score']:.4f}, recent={c['recent_accidents']}, "
                  f"trend={c['avg_trend_score']:+.4f}")

    # ======================================================
    # ENHANCED EXPORT WITH TEMPORAL DATA
    # ======================================================
    def export_to_geojson(self, filename="accidents_clustered.geojson"):
        """Export with temporal weights, danger scores, and cluster centers combined for React app"""
        if self.clustered_df is None:
            return
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_folder = os.path.join(script_dir, "data")
        os.makedirs(data_folder, exist_ok=True)
        output = os.path.join(data_folder, filename)

        geojson = {"type": "FeatureCollection", "features": []}
        
        # Add accident points with type="accident_point"
        for _, row in self.clustered_df.iterrows():
            properties = {k: row[k] for k in row.index if k not in ["longitude", "latitude"]}
            # Convert numpy types to Python native types for JSON serialization
            for key, value in properties.items():
                if isinstance(value, (np.integer, np.floating)):
                    properties[key] = value.item()
                elif isinstance(value, np.ndarray):
                    properties[key] = value.tolist()
                elif pd.isna(value):
                    properties[key] = None
                elif isinstance(value, pd.Timestamp):
                    properties[key] = value.isoformat()
            
            # Add type identifier for React app
            properties["type"] = "accident_point"
            
            geojson["features"].append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [row["longitude"], row["latitude"]]},
                "properties": properties
            })
        
        # Add cluster centers with type="cluster_center"
        if self.cluster_centers:
            for cluster in self.cluster_centers:
                cluster_properties = cluster.copy()
                cluster_properties["type"] = "cluster_center"
                
                geojson["features"].append({
                    "type": "Feature", 
                    "geometry": {"type": "Point", "coordinates": [cluster["center_lon"], cluster["center_lat"]]},
                    "properties": cluster_properties
                })
        
        with open(output, "w", encoding="utf-8") as f:
            json.dump(geojson, f, indent=2, ensure_ascii=False)
        print(f" Exported combined GeoJSON to {output}")

    def export_cluster_centers(self, filename="cluster_centers.json"):
        """Export cluster centers with danger scores for mobile app"""
        if not self.cluster_centers:
            return
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_folder = os.path.join(script_dir, "data")
        os.makedirs(data_folder, exist_ok=True)
        output = os.path.join(data_folder, filename)
            
        with open(output, "w", encoding="utf-8") as f:
            json.dump(self.cluster_centers, f, indent=2, ensure_ascii=False)
        print(f" Exported cluster centers to {output}")

    def export_mobile_alerts(self, filename="mobile_alerts.json", threshold_percentile=20):
        """Export mobile-ready alert data"""
        alert_data = self.generate_mobile_alert_data(
            self.get_alert_worthy_clusters(threshold_percentile)
        )
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_folder = os.path.join(script_dir, "data")
        os.makedirs(data_folder, exist_ok=True)
        output = os.path.join(data_folder, filename)
        
        with open(output, "w", encoding="utf-8") as f:
            json.dump(alert_data, f, indent=2, ensure_ascii=False)
        print(f" Exported {len(alert_data)} mobile alerts to {output}")

    # ======================================================
    # MAIN PIPELINE
    # ======================================================
    def main(self, auto_tune=False, export_alerts=True):
        """Enhanced main pipeline with temporal analysis"""
        if not self.load_geojson_data(): 
            return
        if not self.preprocess_data(): 
            return
        
        n_points = len(self.df)
        
        # Calculate dynamic sub-clustering threshold (scales with dataset size)
        self.highway_cluster_threshold = max(300, int(n_points * 0.035))
        print(f"Dynamic sub-cluster threshold: {self.highway_cluster_threshold} accidents")
        
        # FIXED parameters for FULL DATASET only (13k+ records)
        # This script processes complete data, not filtered subsets
        min_cluster_size = 25      # Needs 25+ accidents (statistical significance)
        min_samples = 15           # Needs 15 points within epsilon
        epsilon = 0.0000008        # ~51m - very tight merge radius
        
        print(f"\n Using FIXED parameters for full dataset ({n_points} points):")
        print(f"   min_cluster_size={min_cluster_size}, min_samples={min_samples}, epsilon={epsilon:.7f}")
        
        if auto_tune:
            print(" Auto-tuning disabled - using proven fixed parameters")
        
        self.perform_clustering(
            min_cluster_size=min_cluster_size,
            min_samples=min_samples,
            cluster_selection_epsilon=epsilon
        )
            
        # Use temporal sub-clustering instead of the old method
        self.temporal_subcluster_large_clusters()
        
        # Calculate enhanced cluster stats
        self.calculate_cluster_centers()
        self.get_cluster_summary()
        
        # Export results
        self.export_to_geojson()
        self.export_cluster_centers()
        
        if export_alerts:
            self.export_mobile_alerts()
            
        print(f"\n Analysis complete! Check data folder for mobile app integration files.")


if __name__ == "__main__":
    analyzer = AccidentClusterAnalyzer()
    analyzer.main()