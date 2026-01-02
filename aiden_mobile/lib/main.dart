import 'package:flutter/material.dart';
import 'package:aiden_mobile/bootstrap.dart';
import 'package:aiden_mobile/app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await bootstrap();

  runApp(const AidenApp());
}
