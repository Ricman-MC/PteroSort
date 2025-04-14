<?php
// Register namespace
namespace Pterodactyl\Http\Controllers\Admin\Extensions\{identifier};

use Illuminate\View\View;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary as BlueprintExtensionLibrary;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Http\RedirectResponse;

// Register extension-specific ExtensionController class.
class {identifier}ExtensionController extends Controller
{
  // Construct class variables.
  public function __construct(
    private ViewFactory $view,
    private BlueprintExtensionLibrary $blueprint,
        private ConfigRepository $config,
    private SettingsRepositoryInterface $settings,
  ) {}

  // Render page upon GET request.
    public function index(): View
    {
      return $this->view->make(
        'admin.extensions.{identifier}.index', [
          'root' => "/admin/extensions/{identifier}",
          'blueprint' => $this->blueprint,
        ]
      );
    }
}

