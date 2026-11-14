<?php
/** READ ONLY. Run via wp eval-file against the reviewed local installation. */
if (!defined('WP_CLI') || !WP_CLI || wp_get_environment_type() !== 'local' || home_url() !== 'http://127.0.0.1:8890') {
    throw new RuntimeException('Export only from the isolated local reference.');
}
$pages = get_option('as_phase2_pages');
$shared = get_option('as_shared_parts_v1');
$media = get_option('as_phase2_media');
if (!$pages || !$shared || count($media ?: array()) !== 7) { throw new RuntimeException('Complete reviewed local reference required.'); }
$replace = array(); $assets = array();
foreach ($media as $name => $id) {
    $key = preg_replace('/[^a-z0-9]/', '_', strtolower($name));
    $file = str_ends_with($name, '.jpg') ? wp_get_original_image_path($id) : get_attached_file($id);
    if (!$file || !is_file($file)) { throw new RuntimeException('Missing original asset.'); }
    $assets[$name] = array('key' => $key, 'sha256' => hash_file('sha256', $file), 'bytes' => filesize($file),
        'alt' => get_post_meta($id, '_wp_attachment_image_alt', true), 'title' => get_the_title($id));
    $replace[wp_get_attachment_url($id)] = '__URL_' . $key . '__';
}
foreach (array('impressum' => '__IMPRINT_URL__', 'datenschutz' => '__PRIVACY_URL__') as $slug => $token) {
    $url = get_permalink($pages[$slug]);
    $replace[$url] = $token; $replace[esc_url($url)] = $token;
}
$replace[home_url('/')] = '__HOME_URL__';
// Long URLs first: a root URL must not consume media/legal URL prefixes.
uksort($replace, static fn($a, $b) => strlen($b) <=> strlen($a));
$convert = function ($content) use ($replace, $media, $assets) {
    $content = strtr($content, $replace);
    foreach ($media as $name => $id) {
        $token = '__ID_' . $assets[$name]['key'] . '__';
        $content = preg_replace('/("id"\s*:\s*)' . (int)$id . '\b/', '${1}' . $token, $content);
        $content = preg_replace('/wp-image-' . (int)$id . '\b/', 'wp-image-' . $token, $content);
    }
    if (str_contains($content, '127.0.0.1') || str_contains($content, 'ZENTRALTEST')) {
        throw new RuntimeException('Unmapped local URL or unrestored editor test.');
    }
    return $content;
};
$documents = array();
foreach ($pages as $slug => $id) {
    $content = get_post_field('post_content', $id);
    if (preg_match('/<(?:header|footer)\b/', $content)) { throw new RuntimeException('Embedded header/footer; migrate locally first.'); }
    $documents['pages/' . $slug . '.html'] = $convert($content);
}
foreach ($shared['parts'] as $slug => $id) {
    if (get_post_type($id) !== 'wp_template_part' || !has_term('andreas-spricht-bordeaux', 'wp_theme', $id)) {
        throw new RuntimeException('Invalid central part.');
    }
    $documents['parts/' . $slug . '.html'] = $convert(get_post_field('post_content', $id));
}
echo wp_json_encode(array('schema' => 1, 'source' => array('wordpress' => get_bloginfo('version'),
    'parent' => wp_get_theme('twentytwentyfive')->get('Version')), 'assets' => $assets, 'documents' => $documents), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
