$(document).ready(function () {
    console.log("Document ready: Setting up event listeners.");

    $('#fetch-income').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event propagation

        const button = $(this); // Reference the button

        Swal.fire({
            title: "Enter your password",
            input: "password",
            inputAttributes: {
                autocapitalize: "off"
            },
            showCancelButton: true,
            confirmButtonText: "Update",
            showLoaderOnConfirm: true,
            allowOutsideClick: () => !Swal.isLoading() // Prevent closing Swal while loading
        }).then((result) => {
            // Only proceed with the AJAX request if the user provided a valid login
            if (result.isConfirmed) {
                const loginValue = result.value;
                $.ajax({
                    url: 'get-income',
                    type: 'POST',
                    data: { password: loginValue },
                    beforeSend: function() {
                        console.log("Before send: Updating button text.");
                        button.html('Please wait...');
                        button.prop('disabled', true);
                        button.fadeTo(200, 0.5); // Make the button semi-transparent
                    },
                    success: function(response) {
                        // Refresh the page once the request is successful
                        window.location.reload();
                    },
                    error: function(xhr, status, error) {
                        iziToast.error({
                            title: 'Error',
                            message: 'Something went wrong',
                        });
                        button.html('Update'); // Reset button text on error
                        button.prop('disabled', false); // Re-enable the button on error
                        button.fadeTo(200, 1); // Make the button fully visible again
                    }
                });
            }
        });
    });

    function formatDateToDot(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0'); // Add leading zero if single digit
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    $('#manual-add-form').on('submit', function(e) {

        e.preventDefault()
    
        $.ajax({
            url: '/income/save',
            type: 'POST',
            data: $(this).serialize(),
            success: function(response) {

                const formattedTo = formatDateToDot(response.to)
                const formattedFrom = formatDateToDot(response.from)

                $('.incomes').append(`<tr id="income-${response.id}">
                <td>
                  ${formattedTo}
                  -
                  ${formattedFrom}
                </td>
                <td>${response.price} PLN</td>
                <td>${response.net_price} PLN</td>
                <td>
                    No file found
                </td>
                <td>
                  <button type="button" data-id="${response.id}" data-from="${response.from}" data-to="${response.to}" data-price="${response.price}" class="btn btn-primary my-2 edit-income">Edit</button>
                  <button type="button" data-id="${response.id}" class="btn btn-danger delete-button" data-bs-whatever="@mdo">Delete</button>
                </td>
              </tr>`)
              $('#exampleModal').modal('hide')
              iziToast.success({
                title: 'Successfull',
                message: 'The income was updated successfully',
            });
            },
            error: function(xhr, status, error) {
                const response = JSON.parse(xhr.responseText);
                iziToast.error({
                    title: 'Error',
                    message: response.message || 'Something went wrong',
                });
            }
        });
    
    })

    $(document).on('click', '.delete-button', function(e) {
        e.preventDefault();
    
        const id = $(this).data('id');
        console.log(id)
    
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: '/income/delete',
                    type: 'DELETE',
                    data: { id: id },
                    success: function(response) {
                        $('#income-' + id).remove();
                    },
                    error: function(xhr, status, error) {
                        iziToast.error({
                            title: 'Error',
                            message: 'Something went wrong',
                        });
                    }
                });
            }
        });
    });
    

    $(document).on('submit', '#manual-update-form', function(e) {

        e.preventDefault()
    
        $.ajax({
            url: '/income/update',
            type: 'POST',
            data: $(this).serialize(),
            success: function(response) {
                window.location.reload()
            },
            error: function(xhr, status, error) {
                const response = JSON.parse(xhr.responseText);
                iziToast.error({
                    title: 'Error',
                    message: response.message,
                });
            }
        });
    
    })

    $(document).on('click', '.edit-income', function(e) {
        e.preventDefault();
    
        // Get raw data from attributes
        const fromRaw = $(this).data('from');
        const toRaw = $(this).data('to');
        const price = $(this).data('price');
        const id = $(this).data('id');
    
        // Format dates to YYYY-MM-DD
        const from = formatDate(new Date(fromRaw));
        const to = formatDate(new Date(toRaw));
    
        $('.edit-from').val(from);
        $('.edit-to').val(to);
        $('.edit-price').val(price);
        $('.update-income-id').val(id)
    
        $('#editIncomeModal').modal('show');
    });
    
    // Utility function to format date
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    $(document).on('change', '.from-date', function(){
        
        const selectedDate = $(this).val();
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 6);
        const formattedNewDate = formatDate(newDate);
        $('.to-date').val(formattedNewDate);
    })
    
    $('#user-update-form').on('submit', function(e) {

        e.preventDefault()

        $.ajax({
            url: '/users/update',
            type: 'POST',
            data: $(this).serialize(),
            success: function(response) {

                $('#firstName').text(response.user.firstName);
                $('#lastName').text(response.user.lastName);
                $('#email').text(response.user.email);

                $('#password').val('');
                $('#repassword').val('');

                iziToast.success({
                    title: 'Success',
                    message: response.message,
                });
            },
            error: function(xhr, status, error) {
                const response = JSON.parse(xhr.responseText);
                iziToast.error({
                    title: 'Error',
                    message: response.message,
                });
            }
        });

    })
});


