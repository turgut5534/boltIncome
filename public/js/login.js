$('#loginForm').on('submit', function(e){

    e.preventDefault()

    $.ajax({
        url: $(this).attr('action'),
        type: 'POST',
        data: $(this).serialize(),
        success: function() {
            window.location.href = '/'
        },
        error: function(xhr, status, error) {
            const response = JSON.parse(xhr.responseText);
            iziToast.error({
                title: 'Error',
                message: response.message,
            });
        }
    })

})