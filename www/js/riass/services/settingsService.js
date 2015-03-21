angular.module( 'riass' )
	.factory( 'settingsService', [ '$rootScope', '$http', '$q', function ( $rootScope, $http, $q ){
		var
			settingsService = {},
			userToken =  'user/' + $rootScope.user.id + '/',
			bcastToken = 'bcast/' + $rootScope.broadcastingId + '/'

		function encodeKey( key ){
			return '/settings/' + key
					.replace( /\/\/CUR_BC\//i, bcastToken )
					.replace( /\/\/CUR_USER\//i, userToken )
					.replace( /\/\/CUR_BC_USER\//i, bcastToken + userToken )
					.replace( /\/\/CUR_USER_BC\//i, userToken + bcastToken )
					.replace( /^\/+/, '' )
		}

		function decodeKey( key ){
			return key
				.replace( /^\/+/, '' )
				.replace( /^settings\//i, '' )
				.replace( userToken + bcastToken, '//CUR_USER_BC/' )
				.replace( bcastToken + userToken, '//CUR_BC_USER/' )
				.replace( userToken, '//CUR_USER/' )
				.replace( new RegExp( '^' + bcastToken ), '//CUR_BC/' )
		}

		settingsService.decodeKey = decodeKey;
		settingsService.encodeKey = encodeKey;

		settingsService.save = function ( key, data, options ){
			var
				_options = angular.extend( {
					public : false
				}, options || {} ),
				_params  = {
					data : data
				};
			if ( _options.public ){
				_params.public = true;
			}
			return $http.post( encodeKey( key ), _params );
		}

		settingsService.load = function ( key ){
			return $http.get(  encodeKey( key ) )
				.then(function ( res ){
					return res.data;
				})
		}

		return settingsService;
	} ] );