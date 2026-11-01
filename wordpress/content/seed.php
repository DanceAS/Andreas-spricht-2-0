<?php
/** One-time bootstrap for this isolated local database, never for a live site. */
if (wp_get_environment_type() !== 'local' || home_url() !== 'http://127.0.0.1:8890') {
    WP_CLI::error('Seed is restricted to the isolated local prototype URL.');
}
if (! wp_get_theme('twentytwentyfive')->exists()) {
    WP_CLI::error('The bundled Twenty Twenty-Five parent theme is required.');
}
switch_theme('andreas-spricht-bordeaux');
update_option('blog_public', '0');
update_option('permalink_structure', '');
if (get_option('as_phase1_page_id')) {
    WP_CLI::success('Prototype already seeded; editor changes preserved.');
    return;
}
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$ids = array();
foreach (array('andreas-scharrer-original.jpg', 'andreas-scharrer-8.jpg') as $name) {
    $temp = wp_tempnam($name);
    if (! copy('/reference-assets/' . $name, $temp)) { WP_CLI::error('Cannot copy local reference image.'); }
    $id = media_handle_sideload(array('name' => $name, 'tmp_name' => $temp), 0);
    if (is_wp_error($id)) { WP_CLI::error($id->get_error_message()); }
    $ids[] = $id;
}
update_post_meta($ids[0], '_wp_attachment_image_alt', 'Andreas Scharrer mit einem geöffneten Buch vor einem Studiomikrofon');
update_post_meta($ids[1], '_wp_attachment_image_alt', 'Andreas Scharrer – Hörbuchsprecher und Schauspieler');
$content = str_replace(array('{{IMAGE_ID}}', '{{IMAGE_URL}}'), array((string) $ids[0], esc_url(wp_get_attachment_url($ids[0]))), file_get_contents('/prototype/hero.html'));
$id = wp_insert_post(array('post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Bordeaux – Phase 1', 'post_content' => wp_slash($content)), true);
if (is_wp_error($id)) { WP_CLI::error($id->get_error_message()); }
update_option('show_on_front', 'page');
update_option('page_on_front', $id);
update_option('as_phase1_page_id', $id);
update_option('as_phase1_image_ids', $ids);
WP_CLI::success('Local native-block hero created; original source files unchanged.');
