<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Sesuai SECURITY.md: batasi origin hanya ke frontend yang tepercaya,
    | jangan pakai wildcard '*'. Origin diambil dari FRONTEND_URL di .env.
    |
    */

    'paths' => ['api/*', 'login', 'logout', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map('trim', explode(
        ',',
        env('FRONTEND_URL', 'http://localhost:3000')
    )))),

    // Izinkan semua subdomain preview Vercel (mis. laundry-abc123.vercel.app).
    'allowed_origins_patterns' => ['#^https://.*\.vercel\.app$#'],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
