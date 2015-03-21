angular.module( 'riass.broadcasting' )
	.service( 'sportsService', [ '$q', '$http', function ( $q, $http ){
		var
			items = [
				{id : 'BT', title : 'Biathlon'},
				{id : 'BS', title : 'Bobsled'},
				{id : 'AS', title : 'Downhill Skiing'},
				{id : 'CU', title : 'Curling'},
				{id : 'NC', title : 'Nordic Combined'},
				{id : 'CC', title : 'Ski'},
				{id : 'SJ', title : 'Ski jumping'},
				{id : 'LG', title : 'Sleigh'},
				{id : 'SN', title : 'Skeleton'},
				{id : 'SS', title : 'Ice Skating'},
				{id : 'SB', title : 'Snowboard'},
				{id : 'FS', title : 'Figure Skating'},
				{id : 'FR', title : 'Freestyle'},
				{id : 'IH', title : 'Hockey'},
				{id : 'ST', title : 'Short Track'}
			],
			resetItem = {
				ID_DISCIPLINE : 'NONE',
				ID_EVENT      : 'NONE'
			},
			sportsService = {
				getItems          : function (){
					return items;
				},
				loadEvents        : function ( item ){
					return $http.get( '/ctrl/getEvents.php', {
						params : {
							id_discipline : item.id
						}
					} ).then( function ( res ){
							return res.data;
						} )
				},
				saveSelectedEvent : function ( event ){
					return $http( {
						method  : 'GET',
						url     : '/ctrl/setFilter.php',
						params  : {
							id_discipline : event.ID_DISCIPLINE,
							id_event      : event.ID_EVENT
						},
						headers : {
							'Accept' : 'text/html'
						}
					} );
				},
				reset : function (){
					return sportsService.saveSelectedEvent( resetItem );
				}
			};

		return sportsService;
	}] )