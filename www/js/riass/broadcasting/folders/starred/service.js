angular.module( 'riass.broadcasting' )
	.service( 'folderTypeStarredService', [ 'widgetsCollectionService', function ( widgetsCollectionService ){
		var
			_widgets = widgetsCollectionService.getCollectionItemsAsObjects( widgetsCollectionService.COLLECTION_STARRED ),
			folderTypeStarredService = {};


		function FolderEngine( data ){
			var
				_folder = data.folder,
				_data = data.data,
				_state = data.state,
				_handlers = data.handlers,
				widgets = [],
				instance = {
					getTitle : function (){
						return 'Starred widgets'
					},
					getStat : function (){
						return _widgets.length || '';
					}
				};

			_state.closable = false;

			_handlers.open = function (){
				//TODO
			}

			return instance;
		}

		folderTypeStarredService.getEngine = FolderEngine;


		folderTypeStarredService.getWidgets = function (){
			return _widgets;
		}

		folderTypeStarredService.addWidget = function ( widget ){
			widgetsCollectionService.addToCollection( widgetsCollectionService.COLLECTION_STARRED, widget );
		}

		return folderTypeStarredService;
	}] )