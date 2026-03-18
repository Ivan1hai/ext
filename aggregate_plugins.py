import os
import json

def aggregate_plugins(root_dir):
    data = []
    
    # Iterate through all items in the root directory
    for item in os.listdir(root_dir):
        item_path = os.path.join(root_dir, item)
        
        # Check if it's a directory and contains a plugin.json
        if os.path.isdir(item_path):
            plugin_json_path = os.path.join(item_path, 'plugin.json')
            if os.path.exists(plugin_json_path):
                try:
                    with open(plugin_json_path, 'r', encoding='utf-8') as f:
                        plugin_meta = json.load(f)
                    
                    metadata = plugin_meta.get('metadata', {})
                    
                    # Construct the plugin entry for the root plugin.json
                    # We use fields from the subdirectory's plugin.json
                    entry = {
                        "name": metadata.get('name'),
                        "author": metadata.get('author'),
                        "path": f"https://raw.githubusercontent.com/Ivan1hai/ext/main/{item}/plugin.zip",
                        "version": metadata.get('version'),
                        "source": metadata.get('source'),
                        "icon": f"https://raw.githubusercontent.com/Ivan1hai/ext/main/{item}/icon.png",
                        "description": metadata.get('description'),
                        "type": metadata.get('type'),
                        "locale": metadata.get('locale')
                    }
                    
                    # Only add if we have core information
                    if entry['name'] and entry['path']:
                        data.append(entry)
                        
                except Exception as e:
                    print(f"Error processing {plugin_json_path}: {e}")

    # Root plugin.json structure
    root_plugin_json = {
        "metadata": {
            "author": "ivanzzz",
            "description": "Danh sách plugin vBook"
        },
        "data": data
    }
    
    # Sort data by name for consistency
    root_plugin_json['data'].sort(key=lambda x: x['name'] if x['name'] else "")
    
    # Save the root plugin.json
    output_path = os.path.join(root_dir, 'plugin.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(root_plugin_json, f, ensure_ascii=False, indent=4)
    
    print(f"Successfully aggregated {len(data)} plugins into {output_path}")

if __name__ == "__main__":
    aggregate_plugins(os.getcwd())
