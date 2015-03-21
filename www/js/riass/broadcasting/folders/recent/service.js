angular.module( 'riass.broadcasting' )
	.service( 'folderTypeRecentService', [ 'widgetsCollectionService', function ( widgetsCollectionService ){
		var
			_widgets = widgetsCollectionService.getCollectionItemsAsObjects( widgetsCollectionService.COLLECTION_RECENT ),
			folderTypeRecentService = {};


		function FolderEngine( data ){
			var
				_folder = data.folder,
				_data = data.data,
				_state = data.state,
				_handlers = data.handlers,
				widgets = [],
				instance = {
					getTitle : function (){
						return 'Recent widgets'
					},
					getStat : function (){
						return _widgets.length || ''
					}
				};

			_state.closable = false;

			_handlers.open = function (){
				//TODO
			}

			return instance;
		}

		folderTypeRecentService.getEngine = FolderEngine;


		folderTypeRecentService.getWidgets = function (){
			return _widgets;
		}

		return folderTypeRecentService;
	}] )