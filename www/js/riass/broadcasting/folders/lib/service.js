angular.module( 'riass.broadcasting' )
	.service( 'folderTypeLibService', [ 'folderSearchService', 'CONST', function ( folderSearchService, CONST ){
		var service = {};

		function FolderEngine( data ){
			var
				_folder = data.folder,
				_data = data.data,
				_state = data.state,
				_handlers = data.handlers,
				_searchEngine = folderSearchService.getSearchEngine(),
				instance = {
					setLimit : function( v ){
						_searchEngine.limit = v;
					},
					getTitle : function (){
						return 'All widgets'
					},
					getStat : function (){
						return _searchEngine.total || '';
					},
					getWidgets : function (){
						return _searchEngine.widgets;
					},
					getTags : function (){
						return _searchEngine.tags;
					},
					getQuery : function (){
						return _searchEngine.query;
					},
					state : _state,
					searchState : _searchEngine.state,
					refresh : refresh,
					loadMore : function (){
						_searchEngine.loadMore();
					},
					getStateToSave : function (){
						var stateToSave = {
							open : _state.open,
							tags : _searchEngine.tags
						}
						if ( _searchEngine.queryValue ){
							stateToSave.query = _searchEngine.queryValue;
						}
						return stateToSave;
					},
					applyState : function ( state ){
						if ( state ){
							angular.extend( _state, _.omit( state, 'tags', 'query', 'open' ) );
							if ( state.tags ){
								_searchEngine.tags = [].concat( state.tags );
							}
							if ( state.query ){
								_searchEngine.query = state.query;
							}
							if ( angular.isDefined( state.open ) ){
								if ( state.open ){
									_folder.open()
								}
								else{
									_folder.close();
								}
							}
						}
					}
				};

			if ( _state.tags ){
				_searchEngine.applyTags( _state.tags );
				delete _state.tags;
			}
			if ( _state.query ){
				_searchEngine.query = _state.query;
				delete _state.query;
			}
			function refresh(){
				_searchEngine.refresh();
			}


			_handlers.open = function (){
				refresh();
				_searchEngine.startUpdating();
			}

			_handlers.close = function (){
				_searchEngine.stopUpdating();
			}

			_handlers.fullscreen = function ( isFullscreen ){
				if ( ! _state.open ){
					if ( isFullscreen ){
						_searchEngine.startUpdating();
					}
					else{
						_searchEngine.stopUpdating();
					}
				}
			}


			_searchEngine.pubStatus = [
				CONST.WIDGET_PUB_STATUS_OFF
			];


			if ( _state.open ){
				_searchEngine.startUpdating();
			}

			_state.closable = false;


			return instance;
		}

		service.getEngine = FolderEngine;

		return service;
	}] )