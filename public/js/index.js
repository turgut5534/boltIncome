$(document).ready(function () {
    console.log("Document ready: Setting up event listeners.");

    $('#fetch-income').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event propagation

        console.log("Fetch button clicked.");

        const button = $(this); // Reference the button

        $.ajax({
            url: 'get-income',
            type: 'POST',
            beforeSend: function() {
                console.log("Before send: Updating button text.");
                button.html('Please wait...');
                button.prop('disabled', true);
                button.fadeTo(200, 0.5);
            },
            success: function(response) {
                window.location.reload()
            },            
            error: function(xhr, status, error) {
                iziToast.error({
                    title: 'Error',
                    message: 'Something went wrong',
                });           
                button.html('Update'); // Reset button text
            }
        });
    });
});
