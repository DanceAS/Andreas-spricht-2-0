<?php
/** READ ONLY WordPress inventory. No HTTP endpoint; run via wp eval-file. */
if (!defined('WP_CLI') || !WP_CLI) { throw new RuntimeException('WP-CLI only; not a web installer.'); }
global $wpdb;
$list = static function ($type) {
    $result = array();
    foreach (get_posts(array('post_type' => $type, 'post_status' => array('publish', 'draft', 'private', 'pending', 'future'), 'numberposts' => -1)) as $p) {
        $result[] = array('id' => $p->ID, 'slug' => $p->post_name, 'status' => $p->post_status,
            'content_sha256' => hash('sha256', $p->post_content),
            'themes' => in_array($type, array('wp_template', 'wp_template_part', 'wp_global_styles'), true) ? wp_get_object_terms($p->ID, 'wp_theme', array('fields' => 'slugs')) : array(),
            'page_template' => $type === 'page' ? get_page_template_slug($p->ID) : null);
    }
    return $result;
};
$uploads = wp_upload_dir(null, false);
$parent = wp_get_theme('twentytwentyfive');
$tables = array();
foreach (array($wpdb->posts, $wpdb->postmeta, $wpdb->options, $wpdb->terms, $wpdb->term_taxonomy, $wpdb->term_relationships) as $table) {
    $r = $wpdb->get_row($wpdb->prepare('SHOW TABLE STATUS WHERE Name = %s', $table));
    $tables[$table] = $r ? $r->Engine : null;
}
echo wp_json_encode(array('read_only' => true, 'wordpress' => get_bloginfo('version'), 'php_cli' => PHP_VERSION,
    'db_server' => $wpdb->db_version(), 'db_charset' => $wpdb->charset, 'db_collate' => $wpdb->collate,
    'home' => get_option('home'), 'siteurl' => get_option('siteurl'), 'multisite' => is_multisite(),
    'environment' => wp_get_environment_type(), 'blog_public' => get_option('blog_public'), 'language' => get_locale(),
    'active_stylesheet' => get_stylesheet(), 'active_template' => get_template(), 'parent_version' => $parent->exists() ? $parent->get('Version') : null,
    'pages' => $list('page'), 'templates' => $list('wp_template'), 'parts' => $list('wp_template_part'), 'global_styles' => $list('wp_global_styles'),
    'front' => array('show_on_front' => get_option('show_on_front'), 'page_on_front' => get_option('page_on_front'), 'page_for_posts' => get_option('page_for_posts')),
    'permalinks' => get_option('permalink_structure'), 'privacy_page' => get_option('wp_page_for_privacy_policy'),
    'plugins' => get_option('active_plugins'), 'mu_plugins_present' => (bool) glob(WPMU_PLUGIN_DIR . '/*.php'),
    'upload_baseurl' => $uploads['baseurl'], 'upload_error' => $uploads['error'], 'max_upload_bytes' => wp_max_upload_size(),
    'tables' => $tables, 'existing_as_pages' => get_option('as_phase2_pages'), 'existing_shared_marker' => get_option('as_shared_parts_v1'),
    'warning' => 'CLI PHP is not proof of Web PHP. Inventory is private operational data; do not commit a hosting dump.'), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
