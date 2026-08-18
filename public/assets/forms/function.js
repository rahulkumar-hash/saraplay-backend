// function loginRequest(form, loginBtn, loginUrl,btnText) {
//     const btn = $("#" + loginBtn);
//     btn.prop("disabled", true).text("Please wait...");
//     const csrfToken = document
//         .querySelector('meta[name="csrf-token"]')
//         .getAttribute("content");
//     fetch(loginUrl, {
//         method: "POST",
//         body: new FormData(form),
//         credentials: "same-origin",
//         headers: {
//             "Content-Type": "application/json",
//             "CSRF-Token": csrfToken
//         }
//     })
//     .then(res => res.json())
//     .then(result => {
//         if (result.status) {
//             notyf.success(result.message);
//             setTimeout(() => {
//                 window.location.href = result.redirect;
//             }, 1000);
//         } else {
//             notyf.error(result.message);
//             btn.prop("disabled", false).text(btnText);
//         }
//     })
//     .catch(() => {
//         notyf.error("Server error, try again");
//         btn.prop("disabled", false).text(btnText);
//     });
// }

$(function () {
  const token = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');

  if (token) {
    $.ajaxSetup({
      headers: {
        'CSRF-Token': token
      }
    });
  }
});


function loginRequest(form, loginBtn, loginUrl, btnText) {
    const btn = $("#" + loginBtn);
    btn.prop("disabled", true).text("Please wait...");
    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        .getAttribute("content");
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // console.log(data);

    fetch(loginUrl, {
        method: "POST",
        body: JSON.stringify(data),
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken
        }
    })
    .then(res => res.json())
    .then(result => {
        if (result.status) {
            notyf.success(result.message);
            setTimeout(() => {
                window.location.href = result.redirect;
            }, 1000);
        } else {
            notyf.error(result.message);
            btn.prop("disabled", false).text(btnText);
        }
    })
    .catch(() => {
        notyf.error("Server error, try again");
        btn.prop("disabled", false).text(btnText);
    });
}


function saveLogoColorSetting(form, btnId, url, btnText) {
    const btn = $("#" + btnId);
    btn.prop("disabled", true).text("Please wait...");

    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        .getAttribute("content");

    const formData = new FormData(form);

    fetch(url, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: {
            "CSRF-Token": csrfToken
        }
    })
    .then(res => res.json())
    .then(result => {
        if (result.status) {
            notyf.success(result.message);
            btn.prop("disabled", false).text(btnText);

            setTimeout(() => {
                window.location.href = "/admin/logo-color-setting";
            }, 3000);
            
        } else {
            notyf.error(result.message);
            btn.prop("disabled", false).text(btnText);
        }
    })
    .catch(() => {
        notyf.error("Server error, try again");
        btn.prop("disabled", false).text(btnText);
    });
}



// ---------------------------------------------------------------------  Manage Games  ------------------------------------------------------

function reloadTable(tableId) {
  $('#'+tableId).DataTable().ajax.reload(null, false);
}

function updateStatus(id, field, value) {

  const label =
    field === 'status'
      ? (value === 'true' ? 'Activate this game?' : 'Deactivate this game?')
      : (value === 'true' ? 'Open market?' : 'Close market?');

  Swal.fire({
    title: label,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#0d6efd',
    cancelButtonColor: '#6c757d'
  }).then((result) => {

    if (result.isConfirmed) {

      $.post('/admin/manage-games/status', { id, field, value }, (res) => {

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: res.res === 'success' ? 'success' : 'error',
          title: res.msg || 'Updated',
          showConfirmButton: false,
          timer: 1200
        });

        if (res.res === 'success') {
          reloadTable();
        }

      });

    }

  });
}


function deleteGame(id) {
  Swal.fire({
    title: 'Delete game?',
    text: 'This action cannot be undone!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel'
  }).then((result) => {

    if (result.isConfirmed) {
      $.post('/admin/manage-games/delete', { id }, (res) => {

        Swal.fire({
          icon: res.res === 'success' ? 'success' : 'error',
          title: res.msg,
          timer: 1500,
          showConfirmButton: false
        });

        if (res.res === 'success') {
          reloadTable("gameTable");
        }
      });
    }

  });
}


function saveGameForm(form, btnId, url, btnText) {
    const btn = $("#" + btnId);
    btn.prop("disabled", true).text("Please wait...");

    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        .getAttribute("content");

    const formData = new FormData(form);
   

    fetch(url, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: {
            "CSRF-Token": csrfToken
        }
    })
    .then(res => res.json())
    .then(result => {

        if (result.res === "success") {
        notyf.success(result.msg);

        // reset form + select2
        form.reset();
        $('.js-days').val(null).trigger('change');

        // close modal
        $('#addGameModal').modal('hide');

        // reload datatable
        $('#gameTable').DataTable().ajax.reload(null, false);

        } else {
            notyf.error(result.msg);
        }

        btn.prop("disabled", false).text(btnText);
    })
    .catch(() => {
        notyf.error("Server error, try again");
        btn.prop("disabled", false).text(btnText);
    });
}



function editGame(id) {

  $.post('/admin/manage-games/get', { id }, function (res) {

    if (res.res !== 'success') {
      Swal.fire('Failed to load game');
      return;
    }

    const g = res.data;

    $('#edit_id').val(g.id);
    $('#edit_name').val(g.name);
    $('#edit_hname').val(g.hname);
    $('#edit_open_time').val(convertTo24Hour(g.open_time));
    $('#edit_close_time').val(convertTo24Hour(g.close_time));
    $('#edit_commission').val(g.commission);

    // Select2 set
    const days = g.closing_day ? g.closing_day.split(',') : [];
    $('#edit_closing_day').val(days).trigger('change');

    $('#editGameModal').modal('show');
  });
}


function convertTo24Hour(time12h) {
    if (!time12h) return '';

    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');

    if (modifier === 'PM' && hours !== '12') {
        hours = parseInt(hours, 10) + 12;
    }

    if (modifier === 'AM' && hours === '12') {
        hours = '00';
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
}



function updateGameRate(form) {

  Swal.fire({
    title: 'Update Game Rate?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, Update',
    cancelButtonText: 'Cancel'
  }).then((result) => {

    if (!result.isConfirmed) return;

    $('#loader').removeClass('d-none');
    $('#gameRateBtn').prop('disabled', true);

    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute('content');

    const formData = new FormData(form);

    fetch('/admin/game-rates/update', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: {
        'CSRF-Token': csrfToken
      }
    })
    .then(res => res.json())
    .then(res => {

      $('#loader').addClass('d-none');
      $('#gameRateBtn').prop('disabled', false);

      if (res.res === 'success') {
        Swal.fire({
          icon: 'success',
          title: res.msg,
          timer: 1200,
          showConfirmButton: false
        });

        setTimeout(() => {
          window.location.href = res.url;
        }, 1200);

      } else {
        Swal.fire({
          icon: 'error',
          title: res.msg
        });
      }
    })
    .catch(() => {
      $('#loader').addClass('d-none');
      $('#gameRateBtn').prop('disabled', false);
      Swal.fire('Server error, try again');
    });

  });
}






//-------------------------------------------------------------------------------- Manage StarLine Game ----------------------------------------
/*
function saveStarLineGame(form) {

    const btn = $('#addGameBtn');
    btn.prop('disabled', true).text('Please wait...');

    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        .getAttribute('content');

    const formData = new FormData(form);

    fetch('/admin/manage-starline-games/add', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: {
        'CSRF-Token': csrfToken
        }
    })
    .then(res => res.json())
    .then(res => { 

        btn.prop('disabled', false).text('Submit');

        if (res.res === 'success') {

        // ✅ Simple success (no SweetAlert)
        notyf.success(res.msg);

        $('#addGameModal').modal('hide');
        form.reset();

        // 🔁 Reload DataTable
        // $('#starlineTable').DataTable().ajax.reload(null, false);
        reloadTable("starlineTable");

        } else {
        // ❌ Simple error
        notyf.error(res.msg);
        }
    })
    .catch(() => {
        btn.prop('disabled', false).text('Submit');
        notyf.error('Server error, try again');
    });
    
}
*/

function deleteStarlineGame(id) {
  Swal.fire({
    title: 'Delete game?',
    text: 'This action cannot be undone!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel'
  }).then((result) => {

    if (result.isConfirmed) {
      $.post('/admin/manage-starline-games/delete', { id }, (res) => {

        Swal.fire({
          icon: res.res === 'success' ? 'success' : 'error',
          title: res.msg,
          timer: 1500,
          showConfirmButton: false
        });

        if (res.res === 'success') {
          reloadTable("starlineTable");
        }
      });
    }

  });
}


function editStarlineGame(id, name, hname, open_time) {

  $('#modalTitle').text('Edit Starline Game');
  $('#starline_id').val(id);
  $('#name').val(name);
  $('#hname').val(hname);

  $('#open_time').val(open_time.split(' ')[0]);

  $('#starlineModal').modal('show');

}

function saveStarlineGame(form) {

  const btn = $('#addGameBtn');
  btn.prop('disabled', true).text('Please wait...');

  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute('content');

  const formData = new FormData(form);
  const id = $('#starline_id').val();

  const url = id
    ? '/admin/manage-starline-games/update'
    : '/admin/manage-starline-games/add';

  fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
    headers: {
      'CSRF-Token': csrfToken
    }
  })
  .then(res => res.json())
  .then(res => {

    btn.prop('disabled', false).text('Save');

    if (res.res === 'success') {

      notyf.success(res.msg);

      $('#starlineModal').modal('hide');
      form.reset();
      $('#starline_id').val('');
      $('#modalTitle').text('Add Starline Game');

      // 🔁 reload DataTable
      $('#starlineTable').DataTable().ajax.reload(null, false);

    } else {
      notyf.error(res.msg);
    }
  })
  .catch(() => {
    btn.prop('disabled', false).text('Save');
    notyf.error('Server error');
  });
}
function toggleStatus(id, field, value) {

  Swal.fire({
    title: 'Change status?',
    icon: 'warning',
    showCancelButton: true
  }).then(r => {

    if (!r.isConfirmed) return;

    $.post(
      '/admin/manage-starline-games/status',
      { id, field, value },
      res => {

        if (res.res === 'success') {
          notyf.success(res.msg);
          $('#starlineTable').DataTable().ajax.reload(null, false);
        } else {
          notyf.error(res.msg);
        }
      }
    );
  });
}

// -------------------------------------------------------------------- Update Star Line -------------------------------------------------------------

function updateStarlineRate(form) {

  $('#loader').removeClass('d-none');

  $.post(
    '/admin/starline-game-rates/update',
    $(form).serialize(),
    function (res) {

      $('#loader').addClass('d-none');

      if (res.res === 'success') {

        notyf.success(res.msg);

        setTimeout(() => {
          window.location.href = res.url;
        }, 1000);

      } else {
        notyf.error(res.msg || 'Update failed');
      }
    }
  ).fail(() => {
    $('#loader').addClass('d-none');
    notyf.error('Server error');
  });
}





//  -------------------------------------------------------------------------- Jackport Game ---------------------------------------------------------




function saveJackpot(form){

   const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute('content');

    const btn = $('#jackpotBtn');
    btn.prop('disabled',true).text('Please wait...');

    const id = $('#jackpot_id').val();
    const url = id
      ? '/admin/manage-jackpot-games/update'
      : '/admin/manage-jackpot-games/add';

    const formData = new FormData(form);

    fetch(url,{
      method:'POST',
      body:formData,
      credentials:'same-origin',
      headers:{ 'CSRF-Token': csrfToken }
    })
    .then(res=>res.json())
    .then(res=>{
      btn.prop('disabled',false).text('Save');

      if(res.res==='success'){
        notyf.success(res.msg);
        $('#jackpotModal').modal('hide');
        form.reset();
        $('#jackpot_id').val('');
        $('#jackpotModalTitle').text('Add Jackpot Game');
        reloadTable("jackpotTable");
      }else{
        notyf.error(res.msg);
      }
    });
}


function editJackpotGame(id,name,close_time){
    $('#jackpotModalTitle').text('Edit Jackpot Game');
    $('#jackpot_id').val(id);
    $('#jackpot_name').val(name);
    $('#jackpot_close_time').val(close_time);
    $('#jackpotModal').modal('show');
}

function toggleJackpotStatus(id,value){
    $.post('/admin/manage-jackpot-games/status',{id,value},()=>{
      reloadTable("jackpotTable");
    });
}

function deleteJackpotGame(id){
    Swal.fire({
      title:'Delete game?',
      icon:'warning',
      showCancelButton:true
    }).then(r=>{
      if(r.isConfirmed){
        $.post('/admin/manage-jackpot-games/delete',{id},res=>{
          notyf.success(res.msg);
          reloadTable("jackpotTable");
        });
      }
    });
}



/* ====================================

=======================================*/

function JackpotResultStatusDelete(id, col, table, action) {

  Swal.fire({
    title: 'Are you sure?',
    text: 'This result will be deleted',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it'
  }).then((result) => {

    if (!result.isConfirmed) return;

      const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute('content');

    $.ajax({
      url: '/admin/delete-jackpot-declare-result',
      type: 'POST',
      headers: {
        "CSRF-Token": csrfToken
      },
      data: {
        id: id
      },
      success: function (res) {

        if (res.status === true) {
          Swal.fire('Deleted!', res.msg, 'success');
          reloadTable("jackpotDataTable");
          if (typeof loadJackpotGames === 'function') {
            loadJackpotGames($('#SubmitDate').val());
          }
        } else {
          Swal.fire('Error', res.msg || 'Delete failed', 'error');
        }

      },
      error: function () {
        Swal.fire('Error', 'Server error', 'error');
      }
    });

  });
}




function loadDeclareForm() {
  $.post('/admin/starline-declare-result/get-game', {
    date: $('#SubmitDate').val(),
    game_id: $('#game_id').val()
  }, res => $('#dr').html(res));
}


/* =========================
   SAVE STARLINE RESULT
========================= */
function saveStarlineResult() {
  const pana  = $('#pana').val();
  const digit = $('#digit').val();
  const date  = $('#SubmitDate').val();
  const game_id = $('#game_id').val();
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  if (!pana || pana === '') {
    Swal.fire({ icon: 'warning', title: 'Please select a Pana first!' });
    return;
  }
  if (!date || !game_id) {
    Swal.fire({ icon: 'warning', title: 'Please select Date and Game first!' });
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (date > todayStr) {
    Swal.fire({ icon: 'warning', title: 'Future dates are not allowed for result declaration!' });
    return;
  }

  $('#slSaveBtn').prop('disabled', true).text('Saving...');

  $.ajax({
    url: '/admin/starline-declare-result/save',
    type: 'POST',
    headers: { 'CSRF-Token': token },
    data: { date, game_id, pana, digit },
    success: function (res) {
      $('#slSaveBtn').prop('disabled', false).text('Save');
      if (res.res === 'success') {
        Swal.fire({ icon: 'success', title: res.msg, confirmButtonText: 'OK', confirmButtonColor: '#0d6efd' });
        if ($.fn.DataTable.isDataTable('#starlineDeclareTable')) {
          $('#starlineDeclareTable').DataTable().ajax.reload(null, false);
        }
      } else {
        Swal.fire({ icon: 'error', title: res.msg });
      }
    },
    error: function () {
      $('#slSaveBtn').prop('disabled', false).text('Save');
      Swal.fire({ icon: 'error', title: 'Server Error. Please try again.' });
    }
  });
}


/* =========================
   DECLARE STARLINE RESULT
========================= */
function declareStarlineResult() {
  const pana  = $('#pana').val();
  const digit = $('#digit').val();
  const date  = $('#SubmitDate').val();
  const game_id = $('#game_id').val();
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  if (!pana || pana === '') {
    Swal.fire({ icon: 'warning', title: 'Please select a Pana first!' });
    return;
  }
  if (!date || !game_id) {
    Swal.fire({ icon: 'warning', title: 'Please select Date and Game first!' });
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (date > todayStr) {
    Swal.fire({ icon: 'warning', title: 'Future dates are not allowed for result declaration!' });
    return;
  }

  Swal.fire({
    title: 'Declare Starline Result?',
    html: `Pana: <strong>${pana}</strong> | Digit: <strong>${digit}</strong><br>This will credit winning amounts to all winners.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Declare!',
    cancelButtonText: 'Cancel'
  }).then(result => {
    if (!result.isConfirmed) return;

    $('#slDeclareBtn').prop('disabled', true).text('Declaring...');

    $.ajax({
      url: '/admin/starline-declare-result/declare',
      type: 'POST',
      headers: { 'CSRF-Token': token },
      data: { date, game_id, pana, digit },
      success: function (res) {
        $('#slDeclareBtn').prop('disabled', false).text('Declare');
        if (res.res === 'success') {
          Swal.fire({ icon: 'success', title: res.msg, confirmButtonText: 'OK', confirmButtonColor: '#0d6efd' });
          if ($.fn.DataTable.isDataTable('#starlineDeclareTable')) {
            $('#starlineDeclareTable').DataTable().ajax.reload(null, false);
          }
          if (typeof loadStarlineGames === 'function') {
            loadStarlineGames($('#SubmitDate').val());
          }
          loadDeclareForm();
        } else {
          Swal.fire({ icon: 'error', title: res.msg });
        }
      },
      error: function () {
        $('#slDeclareBtn').prop('disabled', false).text('Declare');
        Swal.fire({ icon: 'error', title: 'Server Error. Please try again.' });
      }
    });
  });
}


/* =========================
   SAVE JACKPOT RESULT
========================= */
function saveJackpotResult() {
  const result = $('#jackpotDigit').val();
  const date   = $('#SubmitDate').val();
  const game_id = $('#game_id').val();
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  if (result === undefined || result === '') {
    Swal.fire({ icon: 'warning', title: 'Please enter a result digit (0-9)!' });
    return;
  }
  if (!date || !game_id) {
    Swal.fire({ icon: 'warning', title: 'Please select Date and Game first!' });
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (date > todayStr) {
    Swal.fire({ icon: 'warning', title: 'Future dates are not allowed for result declaration!' });
    return;
  }

  $('#jackpotSaveBtn').prop('disabled', true).text('Saving...');

  $.ajax({
    url: '/admin/jackpot-save-result',
    type: 'POST',
    headers: { 'CSRF-Token': token },
    data: { date, game_id, result },
    success: function (res) {
      $('#jackpotSaveBtn').prop('disabled', false).text('Save');
      if (res.res === 'success') {
        Swal.fire({ icon: 'success', title: res.msg, confirmButtonText: 'OK', confirmButtonColor: '#0d6efd' });
        if ($.fn.DataTable.isDataTable('#jackpotDataTable')) {
          $('#jackpotDataTable').DataTable().ajax.reload(null, false);
        }
      } else {
        Swal.fire({ icon: 'error', title: res.msg });
      }
    },
    error: function () {
      $('#jackpotSaveBtn').prop('disabled', false).text('Save');
      Swal.fire({ icon: 'error', title: 'Server Error. Please try again.' });
    }
  });
}


/* =========================
   DECLARE JACKPOT RESULT
========================= */
function declareJackpotResult() {
  const result = $('#jackpotDigit').val();
  const date   = $('#SubmitDate').val();
  const game_id = $('#game_id').val();
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  if (result === undefined || result === '') {
    Swal.fire({ icon: 'warning', title: 'Please enter a result digit (0-9)!' });
    return;
  }
  if (!date || !game_id) {
    Swal.fire({ icon: 'warning', title: 'Please select Date and Game first!' });
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (date > todayStr) {
    Swal.fire({ icon: 'warning', title: 'Future dates are not allowed for result declaration!' });
    return;
  }

  Swal.fire({
    title: 'Declare Jackpot Result?',
    html: `Digit: <strong>${result}</strong><br>This will credit winning amounts to all winners and send notifications.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Declare!',
    cancelButtonText: 'Cancel'
  }).then(resObj => {
    if (!resObj.isConfirmed) return;

    $('#jackpotDeclareBtn').prop('disabled', true).text('Declaring...');

    $.ajax({
      url: '/admin/jackpot-declare-result',
      type: 'POST',
      headers: { 'CSRF-Token': token },
      data: { date, game_id, result },
      success: function (res) {
        $('#jackpotDeclareBtn').prop('disabled', false).text('Declare Result');
        if (res.res === 'success') {
          Swal.fire({ icon: 'success', title: res.msg, confirmButtonText: 'OK', confirmButtonColor: '#0d6efd' });
          if ($.fn.DataTable.isDataTable('#jackpotDataTable')) {
            $('#jackpotDataTable').DataTable().ajax.reload(null, false);
          }
          if (typeof loadJackpotGames === 'function') {
            loadJackpotGames($('#SubmitDate').val());
          }
          loadJackpotDeclareForm();
        } else {
          Swal.fire({ icon: 'error', title: res.msg });
        }
      },
      error: function () {
        $('#jackpotDeclareBtn').prop('disabled', false).text('Declare Result');
        Swal.fire({ icon: 'error', title: 'Server Error. Please try again.' });
      }
    });
  });
}


/* =========================
   DELETE RESULT
========================= */
function deleteResult(id) {
  Swal.fire({
    title: "Delete result?",
    icon: "warning",
    showCancelButton: true
  }).then(r => {
    if (r.isConfirmed) {
      $.ajax({
        url: '/admin/starline-declare-result/delete',
        type: 'POST',
        headers: { "CSRF-Token": csrfToken },
        data: { id },
        success: res => {
          Swal.fire(res.msg);
          if (res.res === 'success') {
            starlineDeclareTable.ajax.reload(null, false);
            if (typeof loadStarlineGames === 'function') {
              loadStarlineGames($('#SubmitDate').val());
            }
          }
        }
      });
    }
  });
}


/* =========================
   WINNER MODAL
========================= */
function quickView() {
  $('#exampleModal').modal('show');
  $('.modal-body').html("<center><i class='fa fa-spinner fa-spin fa-3x'></i></center>");

  $.post('/admin/starline-declare-result/show-winner', {
    game_id: $('#game_id').val(),
    date: $('#SubmitDate').val(),
    pana: $('#pana').val(),
    digit: $('#digit').val()
  }, res => $('.modal-body').html(res));
}



