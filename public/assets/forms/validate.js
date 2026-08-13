const notyf = new Notyf({
    duration: 2500,
    position: { x: "center", y: "top" }
});

const CSRF_TOKEN = "<%= csrfToken %>";

$(document).ready(function () {

    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        .getAttribute("content");


    $("#loginForm").validate({
        rules: {
            email: {
                required: true
            },
            password: {
                required: true,
                minlength: 4
            }
        },

        messages: {
            email: {
                required: "Username is required"
            },
            password: {
                required: "Password is required",
                minlength: "Minimum 4 characters"
            }
        },

        highlight: function (element) {
            $(element).addClass("is-invalid").removeClass("is-valid");
        },

        unhighlight: function (element) {
            $(element).removeClass("is-invalid").addClass("is-valid");
        },

        errorPlacement: function (error) {
            notyf.error(error.text());
        },

        submitHandler: function (form) {
            loginRequest(form, "loginBtn", "/api/login","Sign In");
        }
    });









    $("#logoColorForm").validate({
        rules: {
            primary_color: {
                required: true
            },
            secondary_color: {
                required: true
            }
        },

        messages: {
            primary_color: {
                required: "Primary color is required"
            },
            secondary_color: {
                required: "Secondary color is required"
            }
        },

        highlight: function (element) {
            $(element).addClass("is-invalid").removeClass("is-valid");
        },

        unhighlight: function (element) {
            $(element).removeClass("is-invalid").addClass("is-valid");
        },

        errorPlacement: function (error) {
            notyf.error(error.text());
        },

        submitHandler: function (form) {
            saveLogoColorSetting(
                form,
                "saveSettingBtn",
                "/admin/logo-color-setting",
                "Save Settings"
            );
        }
    });




// ------------------------------------------------------------------------------------  Manage Game --------------------------------
    $('#gameTable').DataTable({
        processing: true,
        serverSide: false,   // client-side pagination
        pageLength: 10,
        ajax: {
        url: '/admin/manage-games/data',
        type: 'POST',
        headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken
        },
        dataSrc: function (res) {
            if (res.res !== 'success') return [];
            return res.data;
        }
        },
        columns: [
        {
            data: null,
            render: (d, t, r, m) => m.row + 1
        },
        { data: 'name' },
        { data: 'hname', defaultContent: '-' },
        { data: 'closing_day', defaultContent: '-' },
        { data: 'open_time' },
        { data: 'close_time' },
        {
            data: 'commission',
            render: d => d + '%'
        },
        {
            data: 'status',
            render: (d, t, r) => `
            <span class="badge ${d === 'true' ? 'bg-success' : 'bg-danger'}"
                style="cursor:pointer"
                onclick="updateStatus(${r.id},'status','${d === 'true' ? 'false' : 'true'}')">
                ${d === 'true' ? 'Yes' : 'No'}
            </span>`
        },
        {
            data: 'market_status',
            render: (d, t, r) => `
            <span class="badge ${d === 'true' ? 'bg-success' : 'bg-danger'}"
                style="cursor:pointer"
                onclick="updateStatus(${r.id},'market_status','${d === 'true' ? 'false' : 'true'}')">
                ${d === 'true' ? 'Open' : 'Close'}
            </span>`
        },
        {
            data: 'id',
            render: id => `
            <button class="btn btn-warning btn-sm me-1"
            onclick="editGame(${id})">
            <i class="fa fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm"
                onclick="deleteGame(${id})">
                <i class="fa fa-trash"></i>
            </button>`
        }
        ]
    });

    $('#addGameModal').on('shown.bs.modal', function () {
        $('.js-days').select2({
            dropdownParent: $('#addGameModal'),
            width: '100%'
        });
    });

    
    $("#addGameForm").validate({

        ignore: [],
        rules: {
            name: { required: true },
            open_time: { required: true },
            close_time: { required: true },
            commission: {
            required: true,
            number: true,
            min: 0
            }
        },

        messages: {
            name: "Game name is required",
            open_time: "Open time required",
            close_time: "Close time required",
            commission: {
            required: "Commission required",
            number: "Enter valid number",
            min: "Must be positive"
            }
        },

        highlight: function (element) {
            $(element).addClass("is-invalid").removeClass("is-valid");
        },

        unhighlight: function (element) {
            $(element).removeClass("is-invalid").addClass("is-valid");
        },

        errorPlacement: function (error) {
            notyf.error(error.text());
        },

        submitHandler: function (form) {
            saveGameForm(
            form,
            "addGameBtn",
            "/admin/manage-games/add",
            "Submit"
            );
        }
        });


    $('#editGameModal').on('shown.bs.modal', function () {
        $('.js-edit-days').select2({
            dropdownParent: $('#editGameModal'),
            width: '100%'
        });
    });

    $('#editGameModal').on('hidden.bs.modal', function () {
        $('.js-edit-days').select2('destroy');
    });



    


    $("#editGameForm").validate({

        ignore: [],

        rules: {
            name: { required: true },
            open_time: { required: true },
            close_time: { required: true },
            // "closing_day[]": { required: true },
            commission: { required: true, number: true }
        },

        submitHandler: function (form) {

            Swal.fire({
            title: 'Update game?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, update'
            }).then(result => {

            if (result.isConfirmed) {

                const formData = new FormData(form);

                fetch('/admin/manage-games/update', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                headers: {
                    'CSRF-Token': document
                    .querySelector('meta[name="csrf-token"]')
                    .getAttribute('content')
                }
                })
                .then(res => res.json())
                .then(res => {

                if (res.res === 'success') {
                    Swal.fire({
                    icon: 'success',
                    title: res.msg,
                    timer: 1200,
                    showConfirmButton: false
                    });

                    $('#editGameModal').modal('hide');
                    reloadTable();

                } else {
                    Swal.fire('Update failed');
                }
                });

            }

            });
        }
    });









    $("#gameRateForm").validate({
        rules: {
            single_digit1: { required: true },
            single_digit2: { required: true }
        },

        messages: {
            single_digit1: "Single Digit Value 1 required",
            single_digit2: "Single Digit Value 2 required"
        },

        highlight: function (element) {
            $(element).addClass("is-invalid").removeClass("is-valid");
        },

        unhighlight: function (element) {
            $(element).removeClass("is-invalid").addClass("is-valid");
        },

        errorPlacement: function (error) {
            notyf.error(error.text());
        },

        submitHandler: function (form) {
            updateGameRate(form);
        }
    });




    




    // -------------------------------------------------------------------------- StarLine Game ------------------------------------------------------
    $('#starlineTable').DataTable({
        processing: true,
        serverSide: false,
        pageLength: 10,

        ajax: {
            url: '/admin/manage-starline-games/data',
            type: 'POST',
            headers: {
            "CSRF-Token": csrfToken
            },
            dataSrc: function (res) {
            if (res.status !== true) return [];
            return res.data;
            }
        },

        columns: [

            {
            data: null,
            render: (d, t, r, m) => m.row + 1
            },

            { data: 'name' },

            { data: 'hname', defaultContent: '-' },

            { data: 'open_time' },

            {
            data: 'status',
            render: (d, t, r) => `
                <span class="badge ${d === 'true' ? 'bg-success' : 'bg-danger'}"
                style="cursor:pointer"
                onclick="toggleStatus(${r.id}, 'status', '${d === 'true' ? 'false' : 'true'}')">
                ${d === 'true' ? 'Yes' : 'No'}
                </span>`
            },

            {
            data: 'market_status',
            render: (d, t, r) => `
                <span class="badge ${d === 'true' ? 'bg-success' : 'bg-danger'}"
                style="cursor:pointer"
                onclick="toggleStatus(${r.id}, 'market_status', '${d === 'true' ? 'false' : 'true'}')">
                ${d === 'true' ? 'Open' : 'Close'}
                </span>`
            },

            {
            data: 'id',
            render: (id, t, r) => `
                <button class="btn btn-warning btn-sm me-1"
                onclick="editStarlineGame(${r.id}, '${r.name}', '${r.hname}', '${r.open_time}')">
                <i class="fa fa-edit"></i>
                </button>

                <button class="btn btn-danger btn-sm"
                onclick="deleteStarlineGame(${id})">
                <i class="fa fa-trash"></i>
                </button>`
            }
        ]
    });
   




    // $("#addGameFormStarLine").validate({

    //     rules: {
    //         name: { required: true },
    //         hname: { required: true },
    //         open_time: { required: true }
    //     },

    //     messages: {
    //         name: "Game name is required",
    //         hname: "Hindi name is required",
    //         open_time: "Open time is required"
    //     },

    //     highlight: function (el) {
    //         $(el).addClass("is-invalid").removeClass("is-valid");
    //     },

    //     unhighlight: function (el) {
    //         $(el).removeClass("is-invalid").addClass("is-valid");
    //     },

    //     errorPlacement: function (error) {
    //         notyf.error(error.text());
    //     },

    //     submitHandler: function (form) {
    //         saveStarLineGame(form);
    //     }
    // });

 

    $("#starlineForm").validate({
        rules: {
            name: { required: true },
            hname: { required: true },
            open_time: { required: true }
        },
        messages: {
            name: "Game name required",
            hname: "Hindi name required",
            open_time: "Open time required"
        },
        errorPlacement: function (error) {
            notyf.error(error.text());
        },
        submitHandler: function (form) {
            saveStarlineGame(form);
        }
    });








// --------------------------------------------------------------------- StarLin Game Rate --------------------------------------------\\

$("#starlineRateForm").validate({

  rules: {
    single_digit1: { required: true, number: true },
    single_digit2: { required: true, number: true },

    single_pana1: { required: true, number: true },
    single_pana2: { required: true, number: true },

    double_pana1: { required: true, number: true },
    double_pana2: { required: true, number: true },

    tripple_pana1: { required: true, number: true },
    tripple_pana2: { required: true, number: true }
  },

  messages: {
    single_digit1: "Required",
    single_digit2: "Required",

    single_pana1: "Required",
    single_pana2: "Required",

    double_pana1: "Required",
    double_pana2: "Required",

    tripple_pana1: "Required",
    tripple_pana2: "Required"
  },

  highlight: function (element) {
    $(element).addClass("is-invalid").removeClass("is-valid");
  },

  unhighlight: function (element) {
    $(element).removeClass("is-invalid").addClass("is-valid");
  },

  errorPlacement: function (error) {
    // 🔔 Same UX as rest of project
    notyf.error(error.text());
  },

  submitHandler: function (form) {
    updateStarlineRate(form);
  }
});

// --------------------------------------------------------------------- jackpot Game Rate --------------------------------------------\\

$('#jackpotTable').DataTable({
  processing: true,
  serverSide: false,
  pageLength: 10,

  ajax: {
    url: '/admin/manage-jackpot-games/data',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    dataSrc: function (res) {
      if (res.status !== true) return [];
      return res.data;
    }
  },

  columns: [

    {
      data: null,
      render: (d, t, r, m) => m.row + 1
    },

    { data: 'name' },

    { data: 'close_time' },

    {
      data: 'status',
      render: (d, t, r) => `
        <span class="badge ${d == true ? 'bg-success' : 'bg-danger'}"
          style="cursor:pointer"
          onclick="toggleJackpotStatus(${r.id}, '${d == true ? 'false' : 'true'}')">
          ${d == true ? 'Active' : 'Inactive'}
        </span>`
    },

    {
      data: 'id',
      render: (id, t, r) => `
        <button class="btn btn-warning btn-sm me-1"
          onclick="editJackpotGame(${r.id}, '${r.name}', '${r.close_time}')">
          <i class="fa fa-edit"></i>
        </button>

        <button class="btn btn-danger btn-sm"
          onclick="deleteJackpotGame(${id})">
          <i class="fa fa-trash"></i>
        </button>`
    }
  ]
});

$("#jackpotForm").validate({
  rules:{
    name:{ required:true },
    close_time:{ required:true }
  },
  messages:{
    name:"Game name required",
    close_time:"Close time required"
  },
  submitHandler:function(form, e){
    e.preventDefault();
    saveJackpot(form);
  }
});




/* ===================================================================================================

Jackport Bid Histroy

======================================================================================================*/
let jackportBidtable = $('#example1').DataTable({
  processing: true,
  serverSide: false,   // 🔥 same as jackpotTable
  pageLength: 10,

  ajax: {
    url: '/admin/jackpot-bid-history/data',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    data: function (d) {
      d.result_date = $('input[name="result_date"]').val();
      d.game = $('select[name="game"]').val();
    },
    dataSrc: function (res) {
      if (res.status !== true) return [];
      return res.data;
    }
  },

  columns: [

    {
      data: null,
      render: (d, t, r, m) => m.row + 1
    },

    {
      data: 'mobile',
      render: (d, t, r) => `
        ${d}
        <a href="/admin/single-user/${r.user_id}">
          <i class="fa fa-external-link"></i>
        </a>
      `
    },

    { data: 'game_name' },

    { data: 'bid_on' },

    {
      data: 'bid_amount',
      render: d => `₹${d}`
    },

    {
      data: 'win_amount',
      render: d => `₹${d}`
    },

    { data: 'created_at' }

  ]
});

$('#jackportfilterForm').on('submit', function (e) {
  e.preventDefault();
  jackportBidtable.ajax.reload();
});









/* ===================================================================================================

Jackpot Declare Result

======================================================================================================*/

let jackpotDeclareTable = $('#jackpotDataTable').DataTable({
  processing: true,
  serverSide: false,
  pageLength: 10,

  ajax: {
    url: '/admin/get-jackpot-declare-game',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    data: function (d) {
      d.date = $('input[name="result_date"]').val();
      d.game_id = $('select[name="game_id"]').val();
    },
    dataSrc: function (res) {
      if (res.status !== true) return [];
      return res.data;
    }
  },

  columns: [

    {
      data: null,
      render: (d, t, r, m) => m.row + 1
    },

    { data: 'game_name' },

    { data: 'result_date' },

    {
      data: 'declare_date',
      render: d => d ? d : '-'
    },

    {
      data: null,
      render: r => `
        ${r.result}
        ${r.declare_date
          ? `<span class="badge badge-danger ms-2"
               style="cursor:pointer"
               onclick="JackpotResultStatusDelete(${r.id},'id','jackpot_declear_result','Delete')">
               <i class="fa fa-trash"></i>
             </span>`
          : ''}
      `
    }

  ]
});


$('#jackpotDeclareFilterForm').on('submit', function (e) {
  e.preventDefault();
  jackpotDeclareTable.ajax.reload();
});





/* ===================================================================================================

Jackpot Result History

======================================================================================================*/

$('#jackportResultHistrory').DataTable({
  processing: true,
  serverSide: false,
  pageLength: 10,
  order: [[0, "desc"]],
  responsive: true,

  ajax: {
    url: '/admin/jackpot-result-history/data',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    dataSrc: function (res) {
      if (res.status !== true) return [];
      return res.data;
    }
  },

  columns: [

    {
      data: null,
      render: (d, t, r, m) => m.row + 1
    },

    { data: 'game_name' },

    { data: 'result_date' },

    {
      data: 'declare_date',
      render: d => d ? d : '-'
    },

    { data: 'result' }

  ]
});





/* ===================================================================================================

Jackpot Winning Report

======================================================================================================*/

let jackpotWinningTable = $('#jackpot_winning_table').DataTable({
  processing: true,
  serverSide: false,
  pageLength: 10,
  order: [[0, "desc"]],
  responsive: true,

  ajax: {
    url: '/admin/jackpot-winning-report/data',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    data: function (d) {
      d.result_date = $('input[name="result_date"]').val();
      d.game = $('select[name="game"]').val();
    },
    dataSrc: function (res) {
      if (res.status !== true) return [];
      return res.data;
    }
  },

  columns: [

    {
      data: null,
      render: (d, t, r, m) => m.row + 1
    },

    {
      data: 'mobile',
      render: (d, t, r) => `
        ${d}
        <a href="/admin/single-user/${r.user_id}">
          <i class="fa fa-external-link"></i>
        </a>
      `
    },

    { data: 'txn_id' },

    { data: 'game_name' },

    { data: 'bid_on' },

    {
      data: 'bid_amount',
      render: d => `₹${d}`
    },

    {
      data: 'amount',
      render: d => `₹${d}`
    },

    { data: 'date' }

  ]
});


$('#jackpotWinningFilterForm').on('submit', function (e) {
  e.preventDefault();
  jackpotWinningTable.ajax.reload();
});






/* ===================================================================================================

Starline Bid History

======================================================================================================*/

let starlineBidTable = $('#bidTable').DataTable({
  processing: true,
  serverSide: false,
  pageLength: 10,
  order: [[0, "desc"]],
  responsive: true,

  ajax: {
    url: '/admin/starline-bid-history/data',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    data: function (d) {
      d.result_date = $('input[name="result_date"]').val();
      d.game = $('select[name="game"]').val();
      d.game_type = $('select[name="game_type"]').val();
    },
    dataSrc: function (res) {
      if (res.status !== true) return [];
      return res.data;
    }
  },

  columns: [

    {
      data: null,
      render: (d, t, r, m) => m.row + 1
    },

    {
      data: 'mobile',
      render: (d, t, r) => `
        ${d}
        <a href="/admin/single-user/${r.user_id}">
          <i class="fa fa-external-link"></i>
        </a>
      `
    },

    { data: 'bid_txn_id' },

    { data: 'game_name' },

    { data: 'game_type' },

    {
      data: 'game_type',
      render: (d, t, r) =>
        d === 'Single Digit' ? r.pana : 'N/A'
    },

    {
      data: 'game_type',
      render: (d, t, r) =>
        ['Single Pana','Double Pana','Triple Pana'].includes(d)
          ? r.pana
          : 'N/A'
    },

    { data: 'points' },

    { data: 'date' }

  ]
});


$('#starlineBidFilterForm').on('submit', function (e) {
  e.preventDefault();
  starlineBidTable.ajax.reload();
});


/* =========================
   LOAD GAMES DROPDOWN
========================= */
  const today = new Date().toISOString().slice(0,10);
  $('#filter_date').val(today).attr("max", today);
  $.get('/admin/manage-starline-games/data', res => {
    let html = '<option value="">-Select Game Name-</option>';
    res.data.forEach(g => {
      html += `<option value="${g.id}">${g.name}</option>`;
    });
    $('#filter_game').html(html);
  });










/* ===================================================================================================

Starline Declare Result

======================================================================================================*/

let starlineDeclareTable = $('#starlineDeclareTable').DataTable({
  processing: true,
  serverSide: false,
  pageLength: 10,
  order: [],
  responsive: true,

  ajax: {
    url: '/admin/starline-declare-result/data',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    data: function (d) {
      d.result_date = $('#SubmitDate').val();
      d.game_id = $('#game_id').val();
    },
    dataSrc: function (res) {
      if (res.status !== true) return [];
      return res.data;
    }
  },

  columns: [

    {
      data: null,
      render: (d, t, r, m) => m.row + 1
    },

    { data: 'game_name' },

    { data: 'result_date' },

    { data: 'declare_date' },

    {
      data: null,
      render: r => `
        ${r.pana}-${r.digit}
        <button class="btn btn-danger btn-sm ms-2"
          onclick="deleteResult(${r.id})">
          Delete
        </button>
      `
    }

  ]
});


/* =========================
   FILTER SUBMIT
========================= */
$('#starlineDeclareFilterForm').on('submit', function (e) {
  e.preventDefault();

  if (typeof starlineDeclareTable !== 'undefined' && starlineDeclareTable.ajax) {
    starlineDeclareTable.ajax.reload();
  } else if ($.fn.DataTable.isDataTable('#starlineDeclareTable')) {
    $('#starlineDeclareTable').DataTable().ajax.reload();
  }

  if ($('#SubmitDate').val() && $('#game_id').val()) {
    loadDeclareForm();
  } else {
    $('#dr').html('<div class="alert alert-info">Please select Date and Game Name above to declare a result.</div>');
  }
});


/* =========================
   LOAD GAMES
========================= */
const todayStr = new Date().toISOString().slice(0, 10);
$('#SubmitDate').attr("max", todayStr);

$.get('/admin/manage-starline-games/data', res => {
  let html = '<option value="">Select Game (All)</option>';
  res.data.forEach(g => {
      html += `<option value="${g.id}">${g.name}</option>`;
  });
  $('#game_id').html(html);
});


/* ===================================================================================================

Starline Result History

======================================================================================================*/

$('#starline_result_history').DataTable({
  processing: true,
  serverSide: false,
  pageLength: 10,
  order: [[0, "desc"]],
  responsive: true,

  ajax: {
    url: '/admin/starline-result-history/data',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    dataSrc: function (res) {
      if (res.status !== true) return [];
      return res.data;
    }
  },

  columns: [

    {
      data: null,
      render: (d, t, r, m) => m.row + 1
    },

    { data: 'game_name' },

    { data: 'result_date' },

    {
      data: 'declare_date',
      render: d => d ? d : '-'
    },

    {
      data: null,
      render: r => `${r.pana} - ${r.digit}`
    }

  ]
});







/* ===================================================================================================

Starline Sell Report

======================================================================================================*/

let starlineSellReportTable = $('#starlineSellTable').DataTable({
  processing: true,
  serverSide: false,
  pageLength: 10,
  order: [[0, "desc"]],
  responsive: true,

  ajax: {
    url: '/admin/starline-sell-report/data',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    data: function (d) {
      d.result_date = $('#sell_result_date').val();
      d.win_game_name = $('#sell_game_id').val();
      d.game_type = $('#sell_game_type').val();
    },
    dataSrc: function (res) {
      if (res.status !== true) return [];
      return res.data;
    }
  },

  columns: [

    {
      data: null,
      render: (d, t, r, m) => m.row + 1
    },

    { data: 'game_name' },

    {
      data: 'game_type',
      render: d => {
        const map = {
          1: 'Single Digit',
          2: 'Jodi Digit',
          3: 'Single Pana',
          4: 'Double Pana',
          5: 'Triple Pana',
          6: 'Half Sangam',
          7: 'Full Sangam'
        };
        return map[d] || d;
      }
    },

    {
      data: 'total_amount',
      render: d => `₹ ${d}`
    }

  ]
});


/* =========================
   FILTER SUBMIT
========================= */
$('#starlineSellFilterForm').on('submit', function (e) {
  e.preventDefault();
  starlineSellReportTable.ajax.reload();
});







/* ===================================================================================================

Starline Winning Report (Server Side Pagination)

======================================================================================================*/

let starlineWinningTable = $('#starlineWinningTable').DataTable({
  processing: true,
  serverSide: true,              // 🔥 backend pagination
  pageLength: 10,
  order: [[0, "desc"]],
  responsive: true,

  ajax: {
    url: '/admin/starline-winning-report/data',
    type: 'POST',
    headers: {
      "CSRF-Token": csrfToken
    },
    data: function (d) {
      d.result_date = $('#sw_result_date').val();
      d.game = $('#sw_game_id').val();
    }
  },

  columns: [

    {
      data: null,
      orderable: false,
      render: (d, t, r, m) => m.row + m.settings._iDisplayStart + 1
    },

    {
      data: 'mobile',
      render: (d, t, r) => `
        ${d}
        <a href="/admin/single-user/${r.user_id}">
          <i class="fa fa-external-link"></i>
        </a>
      `
    },

    { data: 'txn_id' },

    { data: 'game_name' },

    { data: 'game_type' },

    {
      data: 'game_type',
      render: (d, t, r) =>
        d === 'Single Digit' ? r.pana : 'N/A'
    },

    {
      data: 'game_type',
      render: (d, t, r) =>
        ['Single Pana','Double Pana','Tripple Pana'].includes(d)
          ? r.pana
          : 'N/A'
    },

    { data: 'points' },

    {
      data: 'amount',
      render: d => `₹${d}`
    },

    { data: 'date' }

  ]
});


/* =========================
   FILTER SUBMIT
========================= */
$('#starlineWinningFilterForm').on('submit', function (e) {
  e.preventDefault();
  starlineWinningTable.ajax.reload();
});
















































































  






});
