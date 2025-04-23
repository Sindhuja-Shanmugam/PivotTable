let data = [];

const csvInput = document.getElementById('csvFile');
const dateFieldSelect = document.getElementById('dateField');
const dateGroupSelect = document.getElementById('dateGroup');
const colSelect = document.getElementById('columnField');
const valueFieldsContainer = document.getElementById('valueFieldsContainer');

csvInput.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      data = results.data;
      const fields = Object.keys(data[0]);

      [dateFieldSelect, colSelect].forEach(select => {
        select.innerHTML = '';
        fields.forEach(f => {
          const opt = document.createElement('option');
          opt.value = opt.textContent = f;
          select.appendChild(opt);
        });
      });

      valueFieldsContainer.innerHTML = '';
      fields.forEach(f => {
        const label = document.createElement('label');
        label.innerHTML = `${f}: 
          <select data-field="${f}">
            <option value="">Ignore</option>
            <option value="sum">Sum</option>
            <option value="avg">Average</option>
            <option value="count">Count</option>
          </select><br>`;
        valueFieldsContainer.appendChild(label);
      });

      document.getElementById('config').style.display = 'block';
    }
  });
});

function formatDate(dateStr, type) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const month = d.getMonth() + 1;
  const quarter = Math.floor((month - 1) / 3) + 1;
  switch (type) {
    case 'year': return `${d.getFullYear()}`;
    case 'month': return `${d.getFullYear()}-${month.toString().padStart(2, '0')}`;
    case 'quarter': return `${d.getFullYear()} Q${quarter}`;
    case 'day': default: return `${d.toISOString().split('T')[0]}`;
  }
}

function generatePivot() {
  const dateField = dateFieldSelect.value;
  const dateGroupType = dateGroupSelect.value;
  const colField = colSelect.value;

  const valFieldAgg = {};
  const selects = valueFieldsContainer.querySelectorAll('select');
  selects.forEach(sel => {
    if (sel.value) valFieldAgg[sel.dataset.field] = sel.value;
  });

  const pivot = {};
  const counts = {};

  data.forEach(row => {
    const rowKey = formatDate(row[dateField], dateGroupType);
    const colKey = row[colField];

    if (!pivot[rowKey]) pivot[rowKey] = {};
    if (!counts[rowKey]) counts[rowKey] = {};

    Object.keys(valFieldAgg).forEach(field => {
      const agg = valFieldAgg[field];
      const key = `${colKey}_${field}_${agg}`;
      const value = parseFloat(row[field]);

      if (!pivot[rowKey][key]) pivot[rowKey][key] = 0;
      if (!counts[rowKey][key]) counts[rowKey][key] = 0;

      if (agg === 'sum' && !isNaN(value)) {
        pivot[rowKey][key] += value;
      } else if (agg === 'avg' && !isNaN(value)) {
        pivot[rowKey][key] += value;
        counts[rowKey][key]++;
      } else if (agg === 'count') {
        pivot[rowKey][key]++;
      }
    });
  });

  const allCols = [...new Set(data.map(row => row[colField]))].sort();
  const allRows = Object.keys(pivot).sort();

  let html = `<table><thead><tr><th>${dateField} (${dateGroupType})</th>`;
  allCols.forEach(col => {
    Object.keys(valFieldAgg).forEach(() => {
      html += `<th class="col-header">${col}</th>`;
    });
  });
  Object.keys(valFieldAgg).forEach(field => {
    html += `<th class="col-header">Grand Total (${field})</th>`;
  });
  html += `</tr><tr><th></th>`;
  allCols.forEach(() => {
    Object.entries(valFieldAgg).forEach(([field, agg]) => {
      html += `<th class="sub-header">${field} (${agg})</th>`;
    });
  });
  html += `</tr></thead><tbody>`;

  allRows.forEach(rowKey => {
    html += `<tr><td>${rowKey}</td>`;
    const rowTotals = {}, rowCounts = {};
    allCols.forEach(col => {
      Object.entries(valFieldAgg).forEach(([field, agg]) => {
        const key = `${col}_${field}_${agg}`;
        let val = pivot[rowKey][key] || 0;
        if (agg === 'avg' && counts[rowKey][key]) val /= counts[rowKey][key];
        html += `<td>${val.toFixed(2)}</td>`;
        rowTotals[field] = (rowTotals[field] || 0) + val;
        if (agg === 'avg' && (pivot[rowKey][key] || 0)) {
          rowCounts[field] = (rowCounts[field] || 0) + 1;
        }
      });
    });
    Object.entries(valFieldAgg).forEach(([field, agg]) => {
      const total = rowTotals[field] || 0;
      const count = rowCounts[field] || 1;
      html += `<td class="grand-total">${(agg === 'avg' ? total / count : total).toFixed(2)}</td>`;
    });
    html += `</tr>`;
  });

  html += `<tr class="grand-total"><td><b>Grand Total</b></td>`;
  const colTotals = {}, colCounts = {};
  allCols.forEach(col => {
    Object.entries(valFieldAgg).forEach(([field, agg]) => {
      let total = 0, count = 0;
      allRows.forEach(rowKey => {
        const key = `${col}_${field}_${agg}`;
        let val = pivot[rowKey][key] || 0;
        if (agg === 'avg' && counts[rowKey][key]) {
          val /= counts[rowKey][key];
          count++;
        }
        total += val;
      });
      colTotals[field] = (colTotals[field] || 0) + total;
      colCounts[field] = (colCounts[field] || 0) + (agg === 'avg' ? count : 1);
      html += `<td><b>${(agg === 'avg' ? total / (count || 1) : total).toFixed(2)}</b></td>`;
    });
  });
  Object.entries(valFieldAgg).forEach(([field, agg]) => {
    const total = colTotals[field] || 0;
    const count = colCounts[field] || 1;
    html += `<td><b>${(agg === 'avg' ? total / count : total).toFixed(2)}</b></td>`;
  });
  html += `</tr></tbody></table>`;

  document.getElementById('pivotTable').innerHTML = html;
}
