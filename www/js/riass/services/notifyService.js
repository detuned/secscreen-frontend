angular.module( 'riass' )
	.service( 'notifyService', [ '$q', '$timeout', function ( $q, $timeout ){
		var
			notifyService = {
				get message(){ return currentMessage || emptyMessage  },
				applyMessage : applyMessage
			},
			emptyMessage = Message(),
			currentMessage;

		function Message( data ){
			var
				_state = {
					activated : false
				},
				_data = angular.extend( {
					ttl : 7000,
					text : '',
					actions : [],
					type : 'text',
					closable : true
				},  data || {} ),


				lifeTimer,
				activateDefer = $q.defer(),
				deactivateDefer = $q.defer(),
				actionDefer =  $q.defer(),

				instance = {
					get text(){ return _data.text },
					get type(){ return _data.type },
					get actions(){ return _data.actions },
					get isActivated(){ return _state.activated },
					get isClosable(){ return ! ! _data.closable },
					whenActivate : function (){
						return activateDefer.promise;
					},
					whenDeactivate : function (){
						return deactivateDefer.promise;
					},
					whenAction : function (){
						return actionDefer.promise;
					},
					activate : function (){
						_state.activated = true;
						activateDefer.resolve();

					},
					deactivate : function (){
						_state.activated = false;
						if ( lifeTimer ){
							$timeout.cancel( lifeTimer );
						}
						deactivateDefer.resolve();
						currentMessage = {};
					},
					action : function ( action ){
						actionDefer.resolve( action );
						instance.deactivate();
					},
					state : _state
				};

			if ( _data.ttl ){
				lifeTimer = $timeout(function (){
					instance.deactivate();
				}, _data.ttl );
			}
			return instance;
		};

		function applyMessage( messageData ){
			if ( currentMessage && currentMessage.deactivate ){
				currentMessage.deactivate();
			}
			currentMessage = Message( messageData );
			currentMessage.activate();
			return currentMessage;
		}

		function deactivate(){
			if ( currentMessage ){
				currentMessage.deactivate();
			}
		}

		return notifyService;
	}] );