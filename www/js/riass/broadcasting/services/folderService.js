angular.module( 'riass.broadcasting' )
	.service( 'folderService', [ '$q', '$timeout', 'CONST', 'settingsService', 'eventsService', function ( $q, $timeout, CONST, settingsService, eventsService ){
		var
			FOLDER_TYPES = {
				'USER'    : 'user',
				'LIB'     : 'lib',
				'STARRED' : 'starred',
				'RECENT'  : 'recent'
			},
			_foldersRegistry = {},
			_colorTypesNum = 4,
			folderService = {};

		folderService.FOLDER_TYPES = FOLDER_TYPES;


		function Folder( data ){
			var
				_defaultData = {
					type   : FOLDER_TYPES.USER,
					public : false
				},
				_data = angular.extend( {}, _defaultData ),
				_engine = {
					onOpen         : function (){
					},
					onClose        : function (){
					},
					getTitle       : function (){
						return 'Folder ' + _data.id
					},
					isUnique       : function (){
						return false;
					},
					getStat        : function (){
						return 'Empty'
					},
					getStateToSave : function (){
						return { open : _state.open }
					},
					applyState     : function ( state ){
						angular.forEach( state, function ( value, key ){
							if ( key == 'open' ){
								if ( value ){
									instance.open()
								}
								else {
									instance.close();
								}
							}
							else {
								_state[ key ] = value;
							}
						} );
					},
					getDataToSave  : function (){
						return { id : _data.id }
					}
				},
				_state = {
					loading        : false,
					error          : false,
					open           : true,
					closable       : true,
					fullscreenable : true,
					draggable      : false
				},
				_handlers = {
					open       : function (){
					},
					close      : function (){
					},
					fullscreen : function (){
					},
					remove     : function (){
					},
					updateData : function (){
					}
				},
				_initDefer,
				instance = {
					get type(){
						return _data.type
					},
					get id(){
						return _data.id
					},
					get title(){
						return _engine.getTitle()
					},
					get stat(){
						return _engine.getStat()
					},
					get colorId(){
						return + _data.id % _colorTypesNum;
					},
					isUnique         : function (){
						return _engine.isUnique();
					},
					state            : _state,
					open             : function (){
						_state.open = true;
						_handlers.open();
					},
					close            : function (){
						_state.open = false;
						_handlers.close();
					},
					toggle           : function (){
						if ( _state.open ){
							this.close();
						}
						else {
							this.open();
						}
					},
					toggleFullscreen : function (){
						_state.fullscreen = ! _state.fullscreen;
						_handlers.fullscreen( _state.fullscreen );
					},
					update           : function ( d ){
						angular.extend( _data, _.omit( d, 'id', 'type' ) );
					},
					onRemove         : function (){
						_handlers.remove();
					},
					whenReady        : function (){
						return _initDefer.promise;
					},
					registerEngine   : function ( registerFn ){
						var res = angular.extend( _engine, registerFn( {
							data     : _data,
							state    : _state,
							handlers : _handlers,
							folder   : instance,
							load     : load,
							save     : save
						} ) );

						eventsService.on( eventsService.EVENTS.SETTING_CHANGED, function ( event, folderData ){
							_handlers.updateData( folderData );
						}, { key : getSettingsUrl() } );
						return res;
					},
					getStateToSave   : function (){
						return _engine.getStateToSave();
					},
					applyState       : function ( state ){
						return _engine.applyState( state );
					},
					getDataToSave    : function (){
						return _engine.getDataToSave();
					}
				};

			function isDataComplete(){
				return angular.isDefined( _data.id ) && angular.isDefined( _data.type );
			}

			function getSettingsUrl(){
				return _data.public
					? '//CUR_BC/folder/' + _data.id
					: '//CUR_USER_BC/folder/' + _data.id;
			}

			function load(){
				_state.loading = true;
				_state.error = false;

				return settingsService.load( getSettingsUrl() )
					.then( function ( folderData ){
						_initDefer.resolve();
						return folderData;
					}, function (){
						_state.error = true;
					} )
					.finally( function (){
						_state.loading = false;
					} );
			}

			function save(){
				_state.loading = true;
				return settingsService.save(
					getSettingsUrl(),
					instance.getDataToSave(),
					{ public : _data.public }
				)
					.finally( function (){
						_state.loading = false;
					} );
			}


			if ( angular.isObject( data ) ){
				if ( data.id && ( data.id in _foldersRegistry ) ){
					/* Folder instance with this id already exists. Update it and then return.*/
					return _.keys( data ).length > 1
						? _foldersRegistry[ data.id ].update( data )
						: _foldersRegistry[ data.id ];
				}
				angular.extend( _data, data );
			}
			else {
				throw new Error( 'Cannot create Folder instance based on ' + data );
			}

			_initDefer = $q.defer();

			if ( _data.id ){
				_initDefer.resolve();
				_foldersRegistry[ _data.id ] = instance;
			}
			if ( _data.focusOnCreate ){
				_state.focused = true;
			}

			return instance;
		}


		folderService.getFolder = Folder;

		return folderService;
	} ] );