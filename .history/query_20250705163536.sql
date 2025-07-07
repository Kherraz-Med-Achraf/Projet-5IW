SELECT 
    to_char(date, 'DD/MM/YYYY') as date_formatee,
    day_of_week,
    to_char(created_at, 'DD/MM/YYYY HH24:MI:SS') as created_at_formatee
FROM presence_sheet 
WHERE date >= '2025-07-04' 
ORDER BY date; 