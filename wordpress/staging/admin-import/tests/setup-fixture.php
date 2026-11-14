<?php
/** Disposable LOCAL target fixture only. Never an importer for hosting. */
if (wp_get_environment_type() !== 'local' || home_url() !== 'http://127.0.0.1:8890') { throw new RuntimeException('Local fixture only'); }
if (get_option('as_i16_fixture')) { throw new RuntimeException('Use a fresh isolated test database'); }
foreach (get_posts(array('post_type'=>'page','post_status'=>'any','numberposts'=>-1)) as $post) { wp_delete_post($post->ID, true); }
$id = wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_name'=>'alter-versuch','post_title'=>'Alter redaktioneller Versuch','post_content'=>'<!-- wp:paragraph --><p>Dieser vorhandene Text bleibt unverändert.</p><!-- /wp:paragraph -->'));
update_option('show_on_front','page'); update_option('page_on_front',$id); update_option('blog_public','0');
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$tmp = wp_tempnam('andreas-scharrer-8.jpg'); copy('/reference-assets/andreas-scharrer-8.jpg',$tmp);
$media = media_handle_sideload(array('name'=>'andreas-scharrer-8.jpg','tmp_name'=>$tmp),0);
if (is_wp_error($media)) { throw new RuntimeException($media->get_error_message()); }
update_post_meta($media,'_wp_attachment_image_alt','Vorhandenes Medium – unverändert lassen');
update_option('as_i16_fixture',array('page'=>$id,'media'=>$media));
echo wp_json_encode(get_option('as_i16_fixture'));
