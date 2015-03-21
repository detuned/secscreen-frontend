window.APP_CONFIG = {

	/**
	 * List of widgets types and widget presets allowed for fast creating
	 */
	widgetTypes : [
		{
			type : 'default'

			/* It's possible to override title of base widget */
//			,title : 'Обычный виджет'
		},
		{
			type : 'goal',
			tags : [ 'Goal' ]
		},
		{
			type : 'person'
		}
		,
		{
			type   : 'default',
			title  : 'Curious fact',
			fields : {
				title : 'Do you know...',
				text  : ''
			}
		},
		{
			type   : 'default',
			title  : 'Stadium card',
			fields : {
				title : 'Stadium',
				text  : ''
			}
		},
		{
			type   : 'goal',
			title  : 'Goal 0:1',
			fields : {
				title : 'Goal!',
				text  : '',
				score : {
					num1 : 0,
					num2 : 1
				}
			}
		},
		{
			type : 'poll'
		},
		{
			type : 'answer'
		},
		{
			type : 'finish'
		},
		{
			type : 'game_moment'
		}

	],

	widgetFromImage : {
		type : 'default',
		fields : {
				title : 'Curious photo',
				img : '%IMG%',
				text : '%IMG.TITLE%'
			},
		tags : [ 'Фотография' ]
	},

	publicationPauseWarning : 120,

//	offline : true,

//	traceErrors : true,

	allowRemoteControl : true,

	allowSportsSelect : true,

	bcWarningInterval : 60
};
