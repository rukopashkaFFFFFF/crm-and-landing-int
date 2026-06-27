<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
  echo json_encode(['ok' => false, 'error' => 'Нет данных']);
  exit;
}

$log = date('Y-m-d H:i:s') . " | Заявка {$input['id']} | {$input['contact']['name']} | {$input['contact']['phone']} | {$input['contact']['email']} | {$input['formSource']}\n";
file_put_contents(__DIR__ . '/leads.txt', $log, FILE_APPEND | LOCK_EX);

$to = 'fcknpolice@gmail.com';
$subject = '=?UTF-8?B?' . base64_encode('Новая заявка ' . $input['id']) . '?=';
$body = formatEmail($input);
$replyTo = !empty($input['contact']['email']) ? $input['contact']['email'] : $to;
$headers = "From: no-reply@webcraft.local\r\nReply-To: $replyTo\r\nContent-Type: text/plain; charset=UTF-8\r\n";
@mail($to, $subject, $body, $headers);

echo json_encode(['ok' => true, 'id' => $input['id']]);

function formatEmail($d) {
  $c = $d['contact'];
  $p = $d['project'];
  return "Новая заявка: {$d['id']}\nДата: {$d['timestamp']}\nИсточник: {$d['formSource']}\n---\nИмя: {$c['name']}\nТелефон: {$c['phone']}\nEmail: {$c['email']}\nКомпания: {$c['company']}\n---\nЦель: {$p['goal']}\nТип: " . (is_array($p['type']) ? implode(', ', $p['type']) : $p['type']) . "\nСфера: {$p['niche']}\nСрок: {$p['deadline']}\nБюджет: {$p['budget']}\nОпции: " . (is_array($p['features']) ? implode(', ', $p['features']) : '') . "\nКомментарий: {$p['comment']}\n---\nАналитика:\nРеферер: {$d['source']}\nВремя на сайте: {$d['timeOnPage']} сек\nГлубина скролла: {$d['scrollDepth']}%\nUTM: {$d['utm_source']} / {$d['utm_medium']}\nУстройство: {$d['screenResolution']}\nЯзык: {$d['language']}";
}
