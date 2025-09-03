import pandas as pd
import numpy as np
from hdbscan import HDBSCAN
import json
from datetime import datetime
import os

class AccidentClusterAnalyzer:
    def __init__(self):
        """Initialize the analyzer."""
        self.df = None
        self.clustered_df = None
        self.cluster_centers = None
        
    def load_geojson_data(self, file_path: str = "data/accidents.geojson"):
        """Load accident data from GeoJSON file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
            
            # Extract data from GeoJSON features
            records = []
            for feature in geojson_data['features']:
                if feature['geometry']['type'] == 'Point':
                    coords = feature['geometry']['coordinates']  # [lon, lat]
                    properties = feature['properties']
                    
                    record = {
                        'longitude': coords[0],
                        'latitude': coords[1],
                        'id': properties.get('id'),
                        'datecommitted': properties.get('datecommitted'),
                        'timecommitted': properties.get('timecommitted'),
                        'barangay': properties.get('barangay'),
                        'offensetype': properties.get('offensetype'),
                        'severity': properties.get('severity'),
                        'year': properties.get('year')
                    }
                    records.append(record)
            
            self.df = pd.DataFrame(records)
            print(f"Successfully loaded {len(self.df)} accident records from {file_path}")
            return True
            
        except FileNotFoundError:
            print(f"File {file_path} not found. Please check the path.")
            return False
        except Exception as e:
            print(f"Error loading GeoJSON file: {e}")
            return False
    
    def preprocess_data(self):
        """Preprocess the data for clustering."""
        if self.df is None:
            print("No data to preprocess. Load data first.")
            return False
        
        # Remove rows with invalid coordinates
        initial_count = len(self.df)
        self.df = self.df.dropna(subset=['latitude', 'longitude'])
        
        # Ensure coordinates are numeric
        self.df['latitude'] = pd.to_numeric(self.df['latitude'], errors='coerce')
        self.df['longitude'] = pd.to_numeric(self.df['longitude'], errors='coerce')
        
        # Remove rows with invalid numeric coordinates
        self.df = self.df.dropna(subset=['latitude', 'longitude'])
        
        print(f"Removed {initial_count - len(self.df)} records with invalid coordinates")
        
        # Convert severity to numeric for analysis if it exists
        if 'severity' in self.df.columns:
            severity_map = {'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'Minor': 0}
            self.df['severity_numeric'] = self.df['severity'].map(severity_map)
        
        print(f"Data preprocessed successfully. {len(self.df)} records ready for clustering.")
        return True
    
    def perform_clustering(self, min_cluster_size=5, min_samples=3, metric='euclidean'):
        """Perform HDBSCAN clustering on accident coordinates."""
        if self.df is None or 'latitude' not in self.df.columns:
            print("Data not preprocessed. Run preprocess_data() first.")
            return False
        
        # Prepare coordinates for clustering
        coords = self.df[['latitude', 'longitude']].values
        
        # Initialize HDBSCAN
        clusterer = HDBSCAN(
            min_cluster_size=min_cluster_size,
            min_samples=min_samples,
            metric=metric,
            cluster_selection_epsilon=0.01  # Adjust based on your coordinate precision
        )
        
        # Perform clustering
        cluster_labels = clusterer.fit_predict(coords)
        
        # Add cluster labels to dataframe
        self.df['cluster'] = cluster_labels
        self.clustered_df = self.df.copy()
        
        # Calculate cluster statistics
        n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
        n_noise = list(cluster_labels).count(-1)
        
        print(f"Clustering completed:")
        print(f"  - Number of clusters: {n_clusters}")
        print(f"  - Number of noise points: {n_noise}")
        
        # Calculate cluster centers and statistics
        self.calculate_cluster_centers()
        
        return True
    
    def calculate_cluster_centers(self):
        """Calculate cluster centers and statistics."""
        if self.clustered_df is None:
            return
        
        # Group by cluster (excluding noise points with cluster = -1)
        cluster_stats = []
        
        for cluster_id in self.clustered_df['cluster'].unique():
            if cluster_id == -1:  # Skip noise points
                continue
                
            cluster_data = self.clustered_df[self.clustered_df['cluster'] == cluster_id]
            
            stats = {
                'cluster_id': int(cluster_id),
                'center_lat': float(cluster_data['latitude'].mean()),
                'center_lon': float(cluster_data['longitude'].mean()),
                'accident_count': len(cluster_data),
                'severity_distribution': cluster_data['severity'].value_counts().to_dict() if 'severity' in cluster_data.columns else {},
                'offense_types': cluster_data['offensetype'].value_counts().to_dict() if 'offensetype' in cluster_data.columns else {},
                'barangays': cluster_data['barangay'].unique().tolist() if 'barangay' in cluster_data.columns else [],
                'year_range': {
                    'min_year': int(cluster_data['year'].min()) if 'year' in cluster_data.columns else None,
                    'max_year': int(cluster_data['year'].max()) if 'year' in cluster_data.columns else None
                }
            }
            cluster_stats.append(stats)
        
        self.cluster_centers = cluster_stats
        print(f"Calculated statistics for {len(cluster_stats)} clusters")
    
    def export_to_geojson(self, output_file: str = "clustered.geojson"):
        """Export clustered data to GeoJSON format."""
        if self.clustered_df is None:
            print("No clustered data to export. Run clustering first.")
            return False
        
        # Create GeoJSON structure
        geojson = {
            "type": "FeatureCollection",
            "features": []
        }
        
        # Add individual accident points
        for idx, row in self.clustered_df.iterrows():
            # Build properties dict with available data
            properties = {
                "cluster": int(row['cluster']),
                "type": "accident_point"
            }
            
            # Add available properties
            for col in ['id', 'datecommitted', 'timecommitted', 'barangay', 'offensetype', 'severity', 'year']:
                if col in row and pd.notna(row[col]):
                    properties[col] = row[col] if not isinstance(row[col], (int, float)) else (int(row[col]) if col == 'year' else row[col])
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row['longitude']), float(row['latitude'])]
                },
                "properties": properties
            }
            geojson["features"].append(feature)
        
        # Add cluster centers if available
        if self.cluster_centers:
            for cluster in self.cluster_centers:
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [cluster['center_lon'], cluster['center_lat']]
                    },
                    "properties": {
                        "cluster_id": cluster['cluster_id'],
                        "accident_count": cluster['accident_count'],
                        "severity_distribution": cluster['severity_distribution'],
                        "offense_types": cluster['offense_types'],
                        "barangays": cluster['barangays'],
                        "year_range": cluster['year_range'],
                        "type": "cluster_center"
                    }
                }
                geojson["features"].append(feature)
        
        # Write to file
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(geojson, f, indent=2, ensure_ascii=False)
            print(f"GeoJSON exported successfully to {output_file}")
            return True
        except Exception as e:
            print(f"Error exporting GeoJSON: {e}")
            return False
    
    def get_cluster_summary(self):
        """Print summary of clustering results."""
        if self.clustered_df is None:
            print("No clustering results available.")
            return
        
        print("\n=== CLUSTER SUMMARY ===")
        print(f"Total accidents: {len(self.clustered_df)}")
        print(f"Clustered accidents: {len(self.clustered_df[self.clustered_df['cluster'] != -1])}")
        print(f"Noise points: {len(self.clustered_df[self.clustered_df['cluster'] == -1])}")
        print(f"Number of clusters: {len(self.clustered_df[self.clustered_df['cluster'] != -1]['cluster'].unique())}")
        
        if self.cluster_centers:
            print("\nCluster details:")
            for cluster in sorted(self.cluster_centers, key=lambda x: x['accident_count'], reverse=True):
                print(f"  Cluster {cluster['cluster_id']}: {cluster['accident_count']} accidents")
                print(f"    Location: ({cluster['center_lat']:.6f}, {cluster['center_lon']:.6f})")
                if cluster['barangays']:
                    print(f"    Barangays: {', '.join(cluster['barangays'][:3])}{'...' if len(cluster['barangays']) > 3 else ''}")
                if cluster['year_range']['min_year']:
                    print(f"    Years: {cluster['year_range']['min_year']}-{cluster['year_range']['max_year']}")


def main():
    """Main execution function."""
    # Configuration
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "data")
    INPUT_FILE = os.path.join(DATA_DIR, "accidents.geojson")
    OUTPUT_FILE = os.path.join(DATA_DIR, "accidents_clustered.geojson")
    
    # Initialize analyzer
    analyzer = AccidentClusterAnalyzer()
    
    # Process data
    print("Loading data from GeoJSON file...")
    if not analyzer.load_geojson_data(INPUT_FILE):
        return
    
    print("Preprocessing data...")
    if not analyzer.preprocess_data():
        return
    
    print("Performing HDBSCAN clustering with hotspot-optimized parameters...")
    # Try different parameter combinations to find optimal clustering
    # Start with more granular settings for hotspot detection
    if not analyzer.perform_clustering(
        min_cluster_size=15,        # Minimum 15 accidents per hotspot
        min_samples=10,             # At least 10 accidents to form core
        metric='haversine'          # Geographic distance
    ):
        return
    
    # If still too few clusters, try more aggressive parameters
    cluster_count = len(analyzer.clustered_df[analyzer.clustered_df['cluster'] != -1]['cluster'].unique())
    if cluster_count < 10:  # If less than 10 clusters, try smaller parameters
        print(f"\nOnly {cluster_count} clusters found. Trying more granular parameters...")
        if not analyzer.perform_clustering(
            min_cluster_size=8,         # Even smaller hotspots
            min_samples=5,              # Lower threshold
            metric='haversine'
        ):
            return
    
    # If still too few clusters, try very aggressive parameters
    cluster_count = len(analyzer.clustered_df[analyzer.clustered_df['cluster'] != -1]['cluster'].unique())
    if cluster_count < 15:  # If less than 15 clusters, try very small parameters
        print(f"\nStill only {cluster_count} clusters found. Trying very granular parameters...")
        if not analyzer.perform_clustering(
            min_cluster_size=5,         # Very small hotspots
            min_samples=3,              # Very low threshold
            metric='haversine'
        ):
            return
    
    print("Exporting to GeoJSON...")
    if not analyzer.export_to_geojson(OUTPUT_FILE):
        return
    
    # Display summary
    analyzer.get_cluster_summary()
    
    print(f"\nProcess completed! Check {OUTPUT_FILE} for the clustered results.")


if __name__ == "__main__":
    main()