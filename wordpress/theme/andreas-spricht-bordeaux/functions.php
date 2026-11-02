<?php
/** Presentation only. Author content remains in native Gutenberg blocks/media. */
// Block templates also call wptexturize directly; preserve supplied punctuation there.
add_filter('run_wptexturize', '__return_false');
add_action('after_setup_theme', function () {
    add_theme_support('editor-styles');
});
add_action('wp_enqueue_scripts', function () {
    $uri = get_stylesheet_directory_uri();
    wp_enqueue_style('as-phase1', $uri . '/prototype.css', array(), '0.1.0');
    wp_enqueue_style('as-reference', $uri . '/reference.css', array(), '0.2.0');
    wp_enqueue_style('as-blocks', $uri . '/blocks.css', array('as-reference'), '0.2.0');
    wp_enqueue_script('as-player', $uri . '/player.js', array(), '0.2.0', true);
    wp_localize_script('as-player', 'asPlayerLabels', array(
        'play' => __('abspielen', 'andreas-spricht-bordeaux'),
        'pause' => __('pausieren', 'andreas-spricht-bordeaux'),
        'position' => __('Wiedergabeposition', 'andreas-spricht-bordeaux'),
        'load' => __('Hörprobe laden', 'andreas-spricht-bordeaux'),
        'playing' => __('Wiedergabe', 'andreas-spricht-bordeaux'),
        'paused' => __('Pausiert', 'andreas-spricht-bordeaux'),
        'ended' => __('Beendet', 'andreas-spricht-bordeaux'),
        'error' => __('Audio nicht verfügbar', 'andreas-spricht-bordeaux'),
    ));
    wp_enqueue_script('as-fit-intro', $uri . '/fit-sample-intro.js', array(), '0.2.0', true);
    wp_enqueue_script('as-mobile-portrait', $uri . '/mobile-about-portrait.js', array(), '0.2.0', true);
});

// Gutenberg uses client IDs in the editor in place of the saved HTML anchors.
// Alias only presentation selectors; post content and native block attributes stay intact.
add_filter('block_editor_settings_all', function ($settings) {
    $css = file_get_contents(get_stylesheet_directory() . '/reference.css') . "\n" . file_get_contents(get_stylesheet_directory() . '/blocks.css');
    $css = strtr($css, array(
        '#studio-books .studio-book' => '.studio-book', '#studio-books .studio-cover' => '.studio-cover',
        '#released-books .released-book' => '.released-book', '#released-books .released-cover' => '.released-cover',
        '#start' => '.hero', '#hoerproben' => '.samples', '#ueber-mich' => '.about',
        '#hoerbuecher' => '.books', '#kontakt' => '.contact',
        "url('facebook.svg')" => "url('" . esc_url(get_stylesheet_directory_uri() . '/facebook.svg') . "')",
    ));
    $settings['styles'][] = array('css' => $css);
    return $settings;
});

// Standard unsynced patterns provide reset defaults with installation-correct URLs.
// Editorial default content is native HTML, never PHP/JS strings.
add_action('init', function () {
    $pages = get_option('as_phase2_pages', array());
    $urls = array(
        '__HOME_URL__' => esc_url(home_url('/')),
        '__IMPRINT_URL__' => isset($pages['impressum']) ? esc_url(get_permalink($pages['impressum'])) : '',
        '__PRIVACY_URL__' => isset($pages['datenschutz']) ? esc_url(get_permalink($pages['datenschutz'])) : '',
    );
    foreach (array('header', 'footer') as $name) {
        register_block_pattern('andreas-spricht/' . $name, array(
            'title' => ucfirst($name) . ' – Andreas spricht',
            'inserter' => false,
            'content' => strtr(file_get_contents(get_stylesheet_directory() . '/patterns/' . $name . '.html'), $urls),
        ));
    }
});
// Theme files may arrive before the reviewed database migration. Keep old pages
// renderable without double headers/footers until that migration commits.
add_filter('get_block_template', function ($template, $id, $type) {
    if ($template && ($template->source ?? '') === 'theme' && $type === 'wp_template' && !get_option('as_shared_parts_v1') &&
        in_array($id, array(get_stylesheet() . '//front-page', get_stylesheet() . '//page', get_stylesheet() . '//index'), true)) {
        $template->content = '<!-- wp:post-content {"layout":{"type":"default"}} /-->';
    }
    return $template;
}, 10, 3);
