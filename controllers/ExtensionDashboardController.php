<?php
// Register namespace
namespace Pterodactyl\BlueprintFramework\Extensions\{identifier};

use Illuminate\View\View;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary as BlueprintExtensionLibrary;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class ExtensionDashboardController extends Controller
{
  // Construct class variables.
  public function __construct(
    private BlueprintExtensionLibrary $blueprint,
    private ConfigRepository $config,
    private SettingsRepositoryInterface $settings,
  ) {}
  
  public function getDragLock() {
    $user = auth()->user();
    if ($user == null) {return response(null);}
    $data = DB::table('{identifier}_userdata')->where('user_id', $user->id)->first();
    if ($data == null) {return response(null);}
    return response($data->dragLock);
  }
  
  public function getCategories() {
    $user = auth()->user();
    if ($user == null) {return response(null);}
    $data = DB::table('{identifier}_userdata')->where('user_id', $user->id)->first();
    if ($data == null) {return response(null);}
    return response($data->categories);
  }
  
  public function getOrder() {
    $user = auth()->user();
    if ($user == null) {return response(null);}
    $data = DB::table('{identifier}_userdata')->where('user_id', $user->id)->first();
    if ($data == null) {return response(null);}
    return response($data->order);
  }
  
  public function getCategoriesOthers() {
    $user = auth()->user();
    if ($user == null) {return response(null);}
    $data = DB::table('{identifier}_userdata')->where('user_id', $user->id)->first();
    if ($data == null) {return response(null);}
    return response($data->categories_others);
  }
  
  public function getOrderOthers() {
    $user = auth()->user();
    if ($user == null) {return response(null);}
    $data = DB::table('{identifier}_userdata')->where('user_id', $user->id)->first();
    if ($data == null) {return response(null);}
    return response($data->order_others);
  }
    
    public function update({identifier}SettingsFormRequest $request)
  {
  
    $userId = auth()->user()->id;
    $valuesToUpdate = $request->normalize();

    DB::table('{identifier}_userdata')
        ->updateOrInsert(
            ['user_id' => $userId],
            $valuesToUpdate
        );

    return response()->json($valuesToUpdate);
  }
}
class {identifier}SettingsFormRequest extends AdminFormRequest
{
  public function rules(): array
  {
    return [
      'dragLock' => 'nullable|numeric|min:0|max:1',
      'categories' => 'nullable|string',
      'order' => 'nullable|string',
      'categories_others' => 'nullable|string',
      'order_others' => 'nullable|string',
    ];
  }

  public function attributes(): array
  {
    return [
      'dragLock' => 'DragLock',
      'categories' => 'Categorie',
      'order' => 'Order',
      'categories_others' => 'Others Categorie',
      'order_others' => 'Others Order',
    ];
  }
}
