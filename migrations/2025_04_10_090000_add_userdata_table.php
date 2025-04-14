<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('{identifier}_userdata', function (Blueprint $table) {
            $table->unsignedInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users');
            $table->boolean('dragLock')->default(0);
            $table->json('categories')->default("[]");
            $table->json('order')->default("[]");
            $table->json('categories_others')->default("[]");
            $table->json('order_others')->default("[]");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::drop('{identifier}_userdata');
    }
};
