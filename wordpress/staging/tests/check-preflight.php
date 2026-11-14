<?php
if (wp_get_environment_type() !== "local" || home_url() !== "http://127.0.0.1:8890") throw new RuntimeException("Local test only");
function as_inventory_hash() {
    global $wpdb;
    $hash = array();
    foreach (array($wpdb->posts, $wpdb->postmeta, $wpdb->options, $wpdb->terms, $wpdb->term_taxonomy, $wpdb->term_relationships) as $table) {
        $hash[$table] = hash('sha256', wp_json_encode($wpdb->get_results("SELECT * FROM $table ORDER BY 1", ARRAY_A)));
    }
    return $hash;
}
$before = as_inventory_hash();
ob_start(); require '/staging/preflight.php'; $inventory = json_decode(ob_get_clean(), true);
$after = as_inventory_hash();
if ($before !== $after) throw new RuntimeException('Inventory changed database tables');
echo wp_json_encode(array('six_tables_unchanged' => true, 'inventory_versions' => array_intersect_key($inventory, array_flip(array('wordpress','php_cli','db_server','parent_version')))));
