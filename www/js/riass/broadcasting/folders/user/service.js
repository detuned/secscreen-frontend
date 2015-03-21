angular.module( 'riass.broadcasting' )
	.service( 'folderTypeUserService', [ '$q', '$rootScope', 'folderSearchService', 'CONST', 'widgetService', 'tagsService',
	function ( $q, $rootScope, folderSearchService, CONST, widgetService, tagsService ){
		var service = {};

		function FolderEngine( data ){
			var
				_folder = data.folder,
				_data = data.data,
				_state = data.state,
				_handlers = data.handlers,
				_load = data.load,
				_save = data.save,
				_searchEngine = folderSearchService.getSearchEngine(),
				_readyDefer = $q.defer(),
				instance = {
					setLimit      : function ( v ){
						_searchEngine.limit = v;
					},
					getTitle      : function (){
						var
							res = [],
							defaultTags;
						if ( ! _state.ready ){
							return 'Loading...';
						}

						if ( _searchEngine.tags.length ){
							res = res.concat(
								_.filter( _searchEngine.tags, tagsService.isTagNotDefault )
							);
							defaultTags = _.filter( _searchEngine.tags, tagsService.isTagDefault )
						}
						if ( _searchEngine.queryValue ){
							res.push( _searchEngine.queryValue );
						}

						if ( res.length ){
							return res.join( ', ' ) + ( defaultTags && defaultTags.length
								? '...'
								: '' );
						}
						else if ( defaultTags && defaultTags.length ){
							return defaultTags.join( ', ' );
						}

						return 'All in a row';
					},
					isUnique : function (){
						return (
							_searchEngine.queryValue ||
							( _searchEngine.tags.length && _.find( _searchEngine.tags, function ( tag ){
								return ! tagsService.isTagDefault( tag );
							} ) )
							);
					},
					getStat       : function (){
						return _searchEngine.total || '';
					},
					getWidgets    : function (){
						return _searchEngine.widgets;
					},
					getTags       : function (){
						return _searchEngine.tags;
					},
					getQuery      : function (){
						return _searchEngine.query;
					},
					refresh       : refresh,
					loadMore      : function (){
						_searchEngine.loadMore();
					},
					isWidgetNew : function ( index ){
						return _searchEngine.isWidgetNew( index );
					},
					appendWidget : function ( widgetData ){
						var widget = widgetService.getWidget( widgetData.id );
						if ( _searchEngine.tags.length ){
							widget.addTags( _searchEngine.tags );
						}
					},
					save          : _save,
					state         : _state,
					searchState   : _searchEngine.state,
					getDataToSave : function (){
						var dataToSave = { tags : _searchEngine.tags };
						if ( _searchEngine.queryValue ){
							dataToSave.query = _searchEngine.queryValue;
						}

						return dataToSave;
					},
					whenReady     : function (){
						return _readyDefer.promise;
					}
				};

			_data.public = true;
			_state.draggable = true;


			function refresh(){
				_searchEngine.refresh();
			}

			_searchEngine.pubStatus = [
				CONST.WIDGET_PUB_STATUS_OFF
			];

			if ( $rootScope.broadcasting && angular.isArray( $rootScope.broadcasting.tags ) ){
				_searchEngine.applyTags( $rootScope.broadcasting.tags );
			}

			function applyFolderData( folderData ){
				if ( folderData ){
					if ( folderData.tags ){
						_searchEngine.applyTags( folderData.tags );
					}
					_searchEngine.query = folderData.query || '';
				}
			}

			_load()
				.then( applyFolderData )
				.finally( function (){
					if ( _state.open ){
						/* If folder was opened while loading data we're starting update immediately */
						_searchEngine.startUpdating();
					}
					_readyDefer.resolve();
					_state.ready = true;
				} );

			_handlers.updateData = applyFolderData;

			_handlers.remove = function (){
				/*
				 * Stop polling because of removing folder from storage space
				 */
				_searchEngine.stopUpdating();
			}

			_handlers.open = function (){
				if ( _state.ready ){
					refresh();
				}
				/* Start polling if it's not yet */
				_searchEngine.startUpdating();
			}

			_handlers.close = function (){
				/* Stop polling because of closing folder */
				_searchEngine.stopUpdating();
			}

			_handlers.fullscreen = function ( isFullscreen ){
				if ( ! _state.open ){
					if ( isFullscreen ){
						_handlers.open();
					}
					else{
						_handlers.close();
					}
				}
			}

			return instance;
		}

		service.getEngine = FolderEngine;

		return service;
	}] )