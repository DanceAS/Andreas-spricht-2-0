<?php
require_once '/var/www/html/wp-load.php';
$pages = get_option('as_phase2_pages');
foreach (array('header', 'footer') as $slug) {
    $file = get_block_file_template(get_stylesheet() . '//' . $slug, 'wp_template_part');
    if (!$file) { throw new RuntimeException('Child default part missing.'); }
    $html = do_blocks($file->content);
    if (str_contains($html, '__HOME_URL__') || str_contains($html, '__IMPRINT_URL__') || str_contains($html, '__PRIVACY_URL__')) { throw new RuntimeException('Unresolved default URL.'); }
    if (substr_count($html, '<' . $slug . ' ') !== 1) { throw new RuntimeException('Invalid default structure.'); }
    if ($slug === 'header' && !str_contains($html, home_url('/') . '#hoerproben')) { throw new RuntimeException('Broken default anchor.'); }
    if ($slug === 'footer' && !str_contains(html_entity_decode($html), get_permalink($pages['datenschutz']))) { throw new RuntimeException('Broken default legal URL.'); }
}
echo json_encode(array('native_file_patterns_render' => true, 'reset_default_links_resolved' => true)), PHP_EOL;
