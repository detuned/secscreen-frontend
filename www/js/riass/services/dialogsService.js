angular.module( 'riass' )
	.service( 'dialogsService', [ '$document', '$compile', '$rootScope', '$timeout', '$q', function ( $document, $compile, $rootScope, $timeout, $q ){
		var
			activeDialog = {},
			dialogsService = {
				get activeDialog(){ return activeDialog }
			},
			_dialogsRegistry = {
			};

		function Dialog( data ){
			var
				element,
				_data = {
					templateUrl : undefined,
					resize : true,
					overlay : 'light',
					closeOnEsc : true,
					dialogData : {}
				},
				_state = {
					open : false,
					ready : false,
					done : false
				},

				_doneDefer = $q.defer(),
				_readyDefer = $q.defer(),

				_enterPressListeners = [],

				instance = {
					get id(){ return _data.id },
					get isOpen() { return _state.open },
					get dialogData(){ return _data.dialogData },
					get isReady(){ return   _state.ready },
					open : function (){
						if ( _state.open ) {
							return;
						}
						var parentElement = $document.find( 'body' );
						if ( activeDialog && activeDialog.close ){
							activeDialog.close();
						}

						activeDialog = instance;
						element = angular.element( '<div class="dialog_wrap"></div>' )
							.appendTo( parentElement );
						element.html( '<dialog data-id="' + _data.id + '" data-template-url="' + _data.templateUrl +  '"' + ( _data.resize === false ? ' data-no-resize' : '' ) + '></dialog><dialog-overlay data-type="' + _data.overlay  + '"></dialog-overlay>' );
						$compile( element.contents() )( _data.scope || $rootScope );

						$document.on( 'keyup.dialog', function ( event ){
							if ( event.keyCode == 13 ){
								angular.forEach( _enterPressListeners, function  ( fn ){
									fn.apply( element, event );
								})
							}
							else if ( event.keyCode == 27 ){
								if ( _data.closeOnEsc ){
									instance.close()
								}
							}
						})
						_state.open = true;
					},
					close : function ( options ){
						if ( ! _state.open ){
							return;
						}
						var _options = angular.extend( {
							doneData : {}
						}, options || {} );
						if ( activeDialog ){
							activeDialog = {};
						}
						element.remove();
						element = null;
						$document.off( '.dialog' );
						_enterPressListeners = [];
						_state.open = false;
					},
					update : function ( d ){
						angular.extend( _data, _.omit( d , 'id' ) );
						_state.ready = false;
						_state.done = false;
						_doneDefer = $q.defer();
						_readyDefer = $q.defer();
					},
					setReady : function (){
						_state.ready = true;
						_readyDefer.resolve();
					},
					setDone : function ( data ){
						_state.done = true;
						if ( ! data || ! data.__notCloseDialog ){
							this.close();
						}
						_doneDefer.resolve( data );
					},
					setFail : function ( data ){
						_state.done = true;
						if ( ! data.__notCloseDialog ){
							this.close();
						}
						_doneDefer.reject( data );
					},
					whenDone : function (){
						return _doneDefer.promise;
					},
					whenReady : function (){
						return _readyDefer.promise;
					},
					onPressEnter : function ( fn ){
						_enterPressListeners.push( fn );
					}
				};


			/* Init */
			if ( angular.isString( data ) || angular.isNumber( data ) ){
				return Dialog( { id : data } );
			}
			else if ( angular.isObject( data ) && data.id ){
				if ( _dialogsRegistry[ data.id ] ){
					_dialogsRegistry[ data.id ].update( data );
					return _dialogsRegistry[ data.id ];
				}
				angular.extend( _data, data );
				_dialogsRegistry[ _data.id ] = instance;
			}
			else{
				throw new Error( 'Cannot create dialog with ', data );
			}

			return instance;
		}

		dialogsService.open = function ( data ){
			var dialog = Dialog( data );
			dialog.open();
			return dialog;
		};

		return dialogsService;
	}] );