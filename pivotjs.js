    let data = [];
    const rowSelect = document.getElementById('rowField');
    const colSelect = document.getElementById('columnField');
    const valSelect = document.getElementById('valueField');
    const aggSelect = document.getElementById('aggregateFunc');

    document.getElementById('csvFile').addEventListener('change', function (e) {//← get the selected file
      const file = e.target.files[0];                                           // read the file, show preview, etc.
      if (!file) return;

      Papa.parse(file, {     //parseing the csv file to object formate
        header: true,        // first row of the CSV as the header row (column names), and convert each row into an object with key-value pairs.
        skipEmptyLines: true,
        complete: function(results) { 
          data = results.data;      //store all parsed data in the object formate //data--> global variable

          // Show preview
          displayCSVPreview(data);

          const fields = Object.keys(data[0]);//extracting the keys from the first row object.
          [rowSelect, colSelect, valSelect].forEach(select => {
            select.innerHTML = '';
            fields.forEach(f => {//loop through each column name
              const opt = document.createElement('option');
              opt.value = opt.textContent = f;
              select.appendChild(opt);
            });
          });

          document.getElementById('config').style.display = 'block';
        }
      });
    });

    function displayCSVPreview(data) {
      if (!data.length) return;

      const headers = Object.keys(data[0]);
      let html = '<table><thead><tr>';
      headers.forEach(header => {
        html += `<th>${header}</th>`;
      });
      html += '</tr></thead><tbody>';

      data.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
          html += `<td>${row[header]}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
      document.getElementById('csvPreview').innerHTML = html;
    }

    function generatePivot() {
      const rowField = rowSelect.value;
      const colField = colSelect.value;
      const valField = valSelect.value;
      const aggFunc = aggSelect.value;

      const pivot = {};
      const counts = {};  // Needed for average

      data.forEach(row => {
        const rowKey = row[rowField];
        const colKey = row[colField];
        const rawValue = row[valField];
        const value = parseFloat(rawValue);

        if (!pivot[rowKey]) {
          pivot[rowKey] = {};
          counts[rowKey] = {};
        }

        if (!pivot[rowKey][colKey]) {
          pivot[rowKey][colKey] = 0;
          counts[rowKey][colKey] = 0;
        }

        switch (aggFunc) {
          case 'sum':
            if (!isNaN(value)) pivot[rowKey][colKey] += value;
            break;
          case 'count':
            pivot[rowKey][colKey] += 1;
            break;
          case 'avg':
            if (!isNaN(value)) {
              pivot[rowKey][colKey] += value;
              counts[rowKey][colKey] += 1;
            }
            break;
        }
      });

      const allCols = [...new Set(data.map(row => row[colField]))].sort();//Creates a list of unique column values (e.g., all products like Apple, Banana)

      //data.map(row => row[colField]) → extracts the values from the selected column field

      //new Set(...) → removes duplicates
      const allRows = Object.keys(pivot).sort();

      let html = `<table><thead><tr><th>${rowField}</th>`;
      allCols.forEach(col => html += `<th>${col}</th>`);
      html += '</tr></thead><tbody>';

      allRows.forEach(rowVal => {
        html += `<tr><td>${rowVal}</td>`;
        allCols.forEach(colVal => {
          let cell = pivot[rowVal][colVal] || 0;
          if (aggFunc === 'avg' && counts[rowVal][colVal]) {
            cell = (cell / counts[rowVal][colVal]).toFixed(2);
          }
          html += `<td>${cell}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
      document.getElementById('pivotTable').innerHTML = html;
    }
