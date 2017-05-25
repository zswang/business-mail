(function () {

  var STORAGE_KEY = 'business-mail-0.0'
  var mailStorage = {
    fetch: function () {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      } catch (ex) {
        return {}
      }
    },
    save: function (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
  }

  var mailData = mailStorage.fetch();
  mailData.fields = mailData.fields || {};

  var fieldList = ['from', 'to'];

  function mailReplace(html) {
    fieldList = ['from', 'to'];
    html.replace(/<span class="default_text"[^>]*>([\w\u4e00-\u9fa5\[\].:-]+)<\/span>/g, function (all, name) {
      if (fieldList.indexOf(name) <= 0) {
        fieldList.push(name);
      }
    });
    pmForm.fieldList = fieldList;

    return html.replace(/#\{date\}/g, function () {
      var now = new Date();

      return now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
    });
  }

  var pmList = new penjs('#list', {
    data: {
      selected: null,
      items: [],
    },
    methods: {
      select: function (item) {
        this.selected = item;
        mailData.selected = pmForm.selected = item.name;
        mailStorage.save(mailData);

        document.querySelector('#mail').innerHTML = mailReplace(item.html);
      },
    },
  });

  var pmForm = new penjs('form', {
    data: {
      fields: mailData.fields,
      selected: mailData.selected,
      fieldList: fieldList,
    },
    methods: {
      download: function () {
        mailStorage.save(mailData);

        document.querySelector('form').submit();
      },
      change: function (key, value) {
        mailData.fields[key] = value;
        mailStorage.save(mailData);
      },
    }
  });

  penjs.Ajax.get('list', function (err, reply) {
    if (err) {
      return;
    }

    if (reply.status === 200) {
      var selected;
      pmList.items = reply.data.map(function (item) {
        if (item.name === mailData.selected) {
          selected = item;
        }
        return item;
      });
      pmList.selected = selected;
      if (selected) {
        document.querySelector('#mail').innerHTML = mailReplace(selected.html);
      }
    }
  });

  document.querySelector('#mail').addEventListener('click', function (e) {
    var target = e.target;
    if (/\bdefault_text\b/.test(target.className)) {
      var element = document.querySelector('input[name="' + target.textContent + '"]');
      e.stopPropagation();
      e.preventDefault();
      element.focus();
    }
  })

})();