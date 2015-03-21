angular.module('riass')
	.service('broadcastingService', [ '$q', '$timeout', '$http', '$rootScope', 'CONST', 'eventsService', 'utilsService',
		function ($q, $timeout, $http, $rootScope, CONST, eventsService, utilsService ) {

		var registry = {};
		function BroadcastingData( data ) {
			var _data = {
			};
			if ( angular.isObject( data ) ){
				_data = angular.extend( {
					status : CONST.BROADCASTING_STATUS_OFF
				}, data );
			}
			else if ( angular.isNumber( data ) || angular.isString( data ) ){
				_data =  registry[ data ] || {};
			}
			if ( angular.isDefined( _data.id ) ){
				if ( ! registry[ _data.id ] ){
					registry[ _data.id ] = {};
				}
				angular.extend( registry[ _data.id ], _data );
				actualize( registry[ _data.id ] );
				return registry[ _data.id ];
			}

			function  actualize( d ){
				angular.forEach( [ 'start_at', 'end_at', 'started_at', 'ended_at' ], function ( key ){
					if ( d[key] && angular.isString( d[key] ) ){
						d[key] = utilsService.isNullDate( d[key] )
							? null
							: utilsService.stringToDate( d[key] )
					}
				} );
				_data.is_service = d.id.toString() === '0';
			}

			return _data;
		}


		var broadcastingService = {
			getBroadcasting: function (id) {
				var deferred = $q.defer();
				deferred.resolve( BroadcastingData( id ) );
				return deferred.promise;
			},

			getActiveBroadcasting : function (){
				return broadcastingService.getBroadcasting( $rootScope.broadcastingId );
			},
			setBroadcastingData: function ( data ){
				return BroadcastingData( data )
			},
			setStatus : function ( bc, status ){
				var
					deferred = $q.defer(),
					url;
				bc = BroadcastingData( bc );
				bc.status = status;
				if ( status == CONST.BROADCASTING_STATUS_ON ){
					url = $rootScope.__getUrl( '//API/bcast/start' );
					bc.started_at = new Date();
				}
				else if ( status == CONST.BROADCASTING_STATUS_OFF ){
					bc.ended_at = new Date();
					url = $rootScope.__getUrl( '//API/bcast/stop' );
				}
				if ( ! url ){
					throw new Error( 'Cannot set unknown status ' + status + ' for broadcasting' );
				}
				$http.post( url, { id : bc.id } ).then(function ( res ){
					bc.status = status;
					deferred.resolve({ bc : bc });
				}, function ( res ){
					deferred.reject( res );
				});
				return deferred.promise;
			}
		};

		eventsService.on( eventsService.EVENTS.BCAST_STARTED, function ( event, bcData ){
			broadcastingService.getActiveBroadcasting().then(function (bc){
				bc.status = CONST.BROADCASTING_STATUS_ON;
				if ( bcData && bcData.start_at ){
					bc.start_at = utilsService.stringToDate( bcData.start_at );
				}
			});
		} );
		eventsService.on( eventsService.EVENTS.BCAST_STOPPED, function ( event, bcData ){
			broadcastingService.getActiveBroadcasting().then(function (bc){
				bc.status = CONST.BROADCASTING_STATUS_OFF;
				if ( bcData && bcData.end_at ){
					bc.end_at = utilsService.stringToDate( bcData.end_at );

				}
			});
		} );
		return broadcastingService;
	} ])