function baixarJSON(tema) {

    fetch('./mapas/'+tema+'.geojson')
        .then(res => res.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = tema+'.geojson';
            a.click();

            URL.revokeObjectURL(url);
        }
    );
}


