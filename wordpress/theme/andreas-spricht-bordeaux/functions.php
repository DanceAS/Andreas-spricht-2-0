<?php
/** Presentation only: all prototype content is stored as editable core blocks. */
add_action('after_setup_theme', function () {
    add_theme_support('editor-styles');
    add_editor_style('prototype.css');
});
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('as-bordeaux-prototype', get_stylesheet_directory_uri() . '/prototype.css', array(), '0.1.0');
});
