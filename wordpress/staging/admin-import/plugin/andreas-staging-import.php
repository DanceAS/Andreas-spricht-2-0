<?php
/**
 * Plugin Name: Andreas spricht – einmaliger Staging-Import
 * Description: Geprüfter Einmalimport ausschließlich für neu.andreasspricht.de. Nach Erfolg entfernbar.
 * Version: 1.0.1
 * Requires at least: 6.8
 * Requires PHP: 8.1
 * Update URI: false
 */
if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/includes/importer.php';
add_action('admin_menu', static function () {
    add_management_page('Bordeaux einmalig importieren', 'Bordeaux einmalig importieren', 'manage_options', 'as-i16', array('AS_I16_Importer', 'page'));
});
add_action('wp_ajax_as_i16', array('AS_I16_Importer', 'request'));
// Deliberately no activation, public endpoint, cron or uninstall deletion hooks.
