import '/imports/ui/client/wordcloud/jqcloud.css';
import '/imports/ui/client/content.html';

// function randomColor() {
//     var o = Math.round, r = Math.random, s = 255;
//     return 'rgba(' + o(r()*s) + ',' + o(r()*s) + ',' + o(r()*s);
// }



export function getWordCloud(urls, render){

    //Deprecated Randomcolor function

    // function randomColor() {
    //     let o = Math.round, r = Math.random, s = 255;
    //     //return 'rgba(' + o(r()*s) + ',' + o(r()*s) + ',' + o(r()*s); // Random Color
    //     return 'rgba(0,0,' + o(r()*s); // Random Blue color
    // }
    
    Meteor.call('scrapeText', urls, function(err, result) {

        const cloudWords = result[0];
        const chartWords = result[1];

        var myChart;
        let labels = [];
        let data = [];
        let backgroundColors = [];
        let borderColors = [];
        

        chartWords.forEach((item,index) => {
            labels.push(item.text);
            data.push(item.weight);
            let color = randomColor({hue: 'blue'});
            backgroundColors.push(color);
            borderColors.push(color);
        });

        //Destroy existing canvas and create new one to use as chart
        $("#chart-canvas").remove();
        var newcanv = document.createElement('canvas');
        newcanv.id = 'chart-canvas';
        $( "#chart" ).append(newcanv);
        const canvas = document.getElementById('chart-canvas');
        const ctx = canvas.getContext('2d');

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '# of Words',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true, 
                            stepSize: 1
                        }
                    }]
                },
                legend: {
                    display: false,
                },
                title: {
                    display: true,
                    text: 'Words found'
                }
            }
        });

        //Create wordcloud
        $('#wordcloud').jQCloud('destroy');
        $('#wordcloud').jQCloud(cloudWords, {
            autoResize:true,
        });
        if(render != undefined){
            render();
        }   
    });
}
