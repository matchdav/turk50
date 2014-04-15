/*
 * Generate a Mechanical Turk timestamp
 *
 * @return the Turk-friendly timestamp
 */

function timestamp(){
	var now = new Date(), month = (now.getUTCMonth()), day = now.getUTCDate();
	if(month < 10)
	{
		month = '0'+month;
	}
	if(day < 10)
	{
		day = '0'+day;
	}
	return now.getUTCFullYear()+'-'+month+'-'+day+'T'+now.getUTCHours()+':'+now.getUTCMinutes()+':'+now.getSeconds()+'Z';
}

module.exports = timestamp;