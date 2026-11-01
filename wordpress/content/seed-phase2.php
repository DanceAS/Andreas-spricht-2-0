<?php
/** Add a NEW Phase-2 site; never overwrite Phase-1 or later editor changes. */
if (wp_get_environment_type() !== 'local' || home_url() !== 'http://127.0.0.1:8890') {
    WP_CLI::error('Phase-2 seed is restricted to the isolated local URL.');
}
update_option('WPLANG', 'de_DE');
if (get_option('as_phase2_pages')) {
    WP_CLI::success('Phase 2 already seeded; all editor changes preserved.');
    return;
}
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$replace = array();
$media = array();
foreach (glob('/reference-assets/*') as $file) {
    $name = basename($file);
    $token = preg_replace('/[^a-z0-9]/', '_', strtolower($name));
    $temp = wp_tempnam($name);
    if (!copy($file, $temp)) { WP_CLI::error('Cannot copy reference asset.'); }
    $id = media_handle_sideload(array('name' => $name, 'tmp_name' => $temp), 0);
    if (is_wp_error($id)) { WP_CLI::error($id->get_error_message()); }
    foreach (array('home', 'impressum', 'datenschutz') as $document) {
        if (preg_match('/<img src="__URL_' . $token . '__" alt="([^"]*)"/', file_get_contents('/prototype/' . $document . '.html'), $alt)) {
            update_post_meta($id, '_wp_attachment_image_alt', html_entity_decode($alt[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            break;
        }
    }
    $media[$name] = $id;
    $replace['__ID_' . $token . '__'] = (string) $id;
    $replace['__URL_' . $token . '__'] = esc_url(wp_get_attachment_url($id));
}
$pages = array();
foreach (array('home' => 'Andreas spricht', 'impressum' => 'Impressum', 'datenschutz' => 'Datenschutzerklärung') as $slug => $title) {
    $id = wp_insert_post(array('post_type' => 'page', 'post_status' => 'publish', 'post_title' => $title, 'post_name' => $slug, 'post_content' => ''), true);
    if (is_wp_error($id)) { WP_CLI::error($id->get_error_message()); }
    $pages[$slug] = $id;
}
$replace['__HOME_URL__'] = esc_url(home_url('/'));
$replace['__IMPRINT_URL__'] = esc_url(get_permalink($pages['impressum']));
$replace['__PRIVACY_URL__'] = esc_url(get_permalink($pages['datenschutz']));
foreach ($pages as $slug => $id) {
    $content = strtr(file_get_contents('/prototype/' . $slug . '.html'), $replace);
    if (preg_match('/__(?:ID|URL|HOME|IMPRINT|PRIVACY)_/', $content)) { WP_CLI::error('Unresolved seed placeholder.'); }
    $result = wp_update_post(array('ID' => $id, 'post_content' => wp_slash($content)), true);
    if (is_wp_error($result)) { WP_CLI::error($result->get_error_message()); }
}
update_option('as_phase2_media', $media);
update_option('as_phase2_pages', $pages);
update_option('page_on_front', $pages['home']);
update_option('show_on_front', 'page');
WP_CLI::success('Three local native-block pages created. Phase-1 page preserved.');
