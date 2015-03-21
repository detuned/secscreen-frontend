angular.module( 'riass.broadcasting' )
	.service( 'storageService', [ '$rootScope', '$http', '$q', '$timeout', 'CONST', 'folderService', 'settingsService', 'utilsService', 'eventsService',  function ( $rootScope, $http, $q, $timeout, CONST, folderService, settingsService, utilsService, eventsService ){
		var
			_userFolders = [],
			_systemFolders = [],
			_closedFolders = [],
			_foldersRegistry = {},
			_settingsKeyFolders = '//CUR_BC/storage',
			_settingsKeyState = '//CUR_USER_BC/storage/state',
			maxUserFolderId = 0,
			maxClosedFolders = 30,
			storageService = {
				get userFolders(){ return _userFolders },
				get systemFolders(){ return _systemFolders },
				get closedFolders(){ return _closedFolders }

			};

		if ( $rootScope.CONFIG && $rootScope.CONFIG.maxClosedFolders ){
			maxClosedFolders = $rootScope.CONFIG.maxClosedFolders;
		}

		storageService.clearUserFolders = function ( data, options ){
			if ( _userFolders.length ){
				angular.forEach( _userFolders, function ( userFolder ){
					userFolder.onRemove();
				})
				_userFolders.length = 0;
			}
		}

		storageService.updateClosedFolders = function ( data ){
			_closedFolders.length = 0;
			angular.forEach( data, function ( folderData ){
				if ( ! maxClosedFolders || _closedFolders.length < maxClosedFolders ){
					_closedFolders.push( _.pick( folderData, 'id', 'title' ) );
				}
			})
		}

		storageService.updateUserFolders = function ( data, options ){
			storageService.clearUserFolders();
			angular.forEach( data, function ( folderData ){
				storageService.addUserFolder( folderData, options )
			})
		}

		storageService.addUserFolder = function ( folderData, options ){
			var
				folder,
				_options = angular.extend( {
					quite : false,
					index : undefined
				}, options || {} );
			if ( folderData && folderData.id && ( folder = _foldersRegistry[ folderData.id  ] ) ){
				folder.update( folderData );
			}
			else{
				folder = folderService.getFolder( folderData );
			}
			if ( folder.id ){
				_foldersRegistry[ folder.id ] = folder;
			}
			else{
				return;
			}
			if ( _.find( _userFolders, function ( f ){
				return f.id && f.id == folder.id;
			} )){
				return;
			}
			if ( ! angular.isDefined( _options.index ) ){
				_userFolders.push( folder );
			}
			else{
				_userFolders.splice( _options.index, 0, folder );
			}
			if ( ! _options.quite ){
				storageService.saveFolders();
			}
			return folder;
		}

		storageService.addNewUserFolder = function (){
			var folder = folderService.getFolder({ id : ++ maxUserFolderId, focusOnCreate : true });
			_foldersRegistry[ folder.id ] = folder;
			_userFolders.unshift( folder );
			return storageService.saveFolders();
		}

		storageService.init = function (){
			var defer = $q.defer();

			if ( $rootScope.CONFIG && $rootScope.CONFIG.recentFolder ){
				_systemFolders.push( folderService.getFolder( { type : folderService.FOLDER_TYPES.RECENT, id : 'recent' } ) );
			}

			// Adding constant system folders
			_systemFolders.push(
				folderService.getFolder( { type : folderService.FOLDER_TYPES.STARRED, id : 'starred' } ),
				folderService.getFolder( { type : folderService.FOLDER_TYPES.LIB, id : 'lib' } )
			);

			// Loading user folders
			storageService.loadAndApplyFolders().then(function ( folders ){
				storageService.loadAndApplyFoldersState().then(function (){
					defer.resolve();
				});
			});


			return defer.promise;
		}

		storageService.removeFolder = function ( folder ){
			if ( ! folder.id || folderService.FOLDER_TYPES.USER != folder.type ){
				// Cannot remove non-user folders
				return;
			}
			var
				folderIndex;
			folder = _.find( _userFolders, function ( f, index ){
				folderIndex = index;
				return f.id && ( f.id == folder.id );
			} );
			if ( folder ){
				folder.onRemove && folder.onRemove();
				_userFolders.splice( folderIndex, 1 );


				if ( folder.isUnique() ){
					_closedFolders.unshift( _.pick( folder, 'id', 'title' ) );
					while ( maxClosedFolders > 0 && ( _closedFolders.length > maxClosedFolders ) ){
						_closedFolders.pop();
					}
				}

				storageService.saveFolders();
			}
		}


		storageService.restoreFolder = function ( folder ){
			if ( ! folder.id ){
				return;
			}
			var
				folderIndex;
			folder = _.find( _closedFolders, function ( f, index ){
				folderIndex = index;
				return f.id && ( f.id == folder.id );
			} );

			if ( folder ){
				_closedFolders.splice( folderIndex, 1 );
				storageService.addUserFolder( { id : folder.id }, { index : 0 } );
			}
		}

		function applyFoldersData( data ){
			if ( data && data.folders ){
				storageService.updateUserFolders( data.folders, { quite : true } );
			}
			if ( data && data.closed){
				storageService.updateClosedFolders( data.closed );
			}
			if ( angular.isDefined ( data.maxFolderId ) ){
				maxUserFolderId = Number( data.maxFolderId );
			}
		}

		storageService.loadAndApplyFolders = function (){
			return settingsService.load( _settingsKeyFolders ).then(function ( res ){
				applyFoldersData( res );
				return res;
			});
		}

		storageService.saveFolders = function (){
			var foldersData = {
				maxFolderId : maxUserFolderId,
				folders : _.reduce( _userFolders, function ( memo, folder ){
					memo.push( { id : folder.id } );
					return memo;
				}, [] ),
				closed : _.reduce( _closedFolders, function ( memo, folder ){
					memo.push( _.pick( folder, 'id', 'title' ) );
					return memo;
				}, [] )
			};
			var res = settingsService.save( _settingsKeyFolders, foldersData, { public : true } );
			storageService.saveFoldersState();
			return res;
		}

		storageService.loadAndApplyFoldersState = function (){
			return settingsService.load( _settingsKeyState ).then(function ( res ){
				var states = res && res.folders
					? res.folders
					: {};
				function applyFolderState( folder ){
					if ( folder.id in states ){
						folder.applyState( states[ folder.id ] || {} );
					}
				}
				angular.forEach( _userFolders, applyFolderState );
				angular.forEach( _systemFolders, applyFolderState );

				return states;
			})
		}

		storageService.saveFoldersState = function (){
			var states = {};
			function countFolderState( folder ){
				if ( folder.id ){
					states[ folder.id ] = folder.getStateToSave();
				}
			}
			angular.forEach( _userFolders, countFolderState );
			angular.forEach( _systemFolders, countFolderState );
			return settingsService.save( _settingsKeyState, { folders : states } );
		}

		storageService.collapseAllFolders = function (){
			function collapseFolder( folder ){
				folder.state.open = false;
			}
			angular.forEach( _userFolders, collapseFolder );
			angular.forEach( _systemFolders, collapseFolder );
			return storageService.saveFoldersState();
		}

		storageService.changeUserFolderPosition = function ( index, newIndex ){
			utilsService.moveArrayElement( _userFolders, index, newIndex );
		}

		eventsService.on( eventsService.EVENTS.SETTING_CHANGED, function ( event, foldersData ){
			applyFoldersData( foldersData );
		}, { key : _settingsKeyFolders } );



		return storageService;
	} ]);