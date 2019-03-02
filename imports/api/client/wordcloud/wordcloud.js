import '/imports/ui/client/wordcloud/jqcloud.css';

export function getWordCloud(url, body, render){
    /* Destroy any existing Wordcloud and Canvas */
    $('#wordcloud').jQCloud('destroy');
    $("#chart-canvas").remove();
    /* Create new canvas */
    var newcanv = document.createElement('canvas');
    newcanv.id = 'chart-canvas';
    $("#chart").append(newcanv);
    const canvas = document.getElementById('chart-canvas');
    const ctx = canvas.getContext('2d');
    Meteor.call('scrapeText', url, body, function(err, result) {
        let { cloudList , chartList } = result

        let myChart;
        let labels = [];
        let data = [];
        let backgroundColors = [];
        let borderColors = [];
        
        chartList.forEach((item,index) => {
            labels.push(item.text);
            data.push(item.weight);
            let color = randomColor({hue: 'blue'});
            backgroundColors.push(color);
            borderColors.push(color);
        });

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Relative Weightage',
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
                            stepSize: 5
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
        $('#wordcloud').jQCloud(cloudList, {
            autoResize:true,
        });
        if(render != undefined){
            render();
        }   
    });
}
