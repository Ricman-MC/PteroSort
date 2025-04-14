<?php

use Pterodactyl\BlueprintFramework\Extensions\{identifier}\ExtensionDashboardController;
use Illuminate\Support\Facades\Route;


    Route::get('/dragLock', [ExtensionDashboardController::class, 'getdragLock']);
    Route::get('/categories', [ExtensionDashboardController::class, 'getCategories']);
    Route::get('/order', [ExtensionDashboardController::class, 'getOrder']);
    Route::get('/categories_others', [ExtensionDashboardController::class, 'getCategoriesOthers']);
    Route::get('/order_others', [ExtensionDashboardController::class, 'getOrderOthers']);
    Route::patch('/', [ExtensionDashboardController::class, 'update']);

