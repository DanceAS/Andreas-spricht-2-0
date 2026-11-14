<?php
foreach (['DB_NAME'=>'wordpress','DB_USER'=>'wordpress','DB_HOST'=>'db','DB_CHARSET'=>'utf8mb4','DB_COLLATE'=>''] as $key=>$value) define($key,$value);
define('DB_PASSWORD',getenv('WORDPRESS_DB_PASSWORD'));
$table_prefix='wp_';
define('WP_ENVIRONMENT_TYPE','local');
define('WP_HTTP_BLOCK_EXTERNAL',true);
define('DISABLE_WP_CRON',true);
define('DISALLOW_FILE_EDIT',true);
define('WP_DEBUG',true);
define('WP_DEBUG_LOG',true);
define('WP_DEBUG_DISPLAY',false);
// Disposable local test only; never package this configuration for hosting.
foreach (['AUTH_KEY','SECURE_AUTH_KEY','LOGGED_IN_KEY','NONCE_KEY','AUTH_SALT','SECURE_AUTH_SALT','LOGGED_IN_SALT','NONCE_SALT'] as $key) define($key, hash('sha256',$key.getenv('WORDPRESS_DB_PASSWORD')));
if (!defined('ABSPATH')) define('ABSPATH',__DIR__.'/');
require_once ABSPATH.'wp-settings.php';
