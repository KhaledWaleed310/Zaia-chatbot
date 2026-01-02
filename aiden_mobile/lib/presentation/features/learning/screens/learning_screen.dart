import 'package:flutter/material.dart';

/// AIDEN Learning dashboard screen
class LearningScreen extends StatelessWidget {
  final String botId;

  const LearningScreen({super.key, required this.botId});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AIDEN Learning'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Neural network visualization placeholder
            Card(
              child: Container(
                height: 200,
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                child: CustomPaint(
                  painter: _NeuralNetworkPainter(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Stats
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.psychology,
                    title: 'Patterns',
                    value: '156',
                    color: Colors.purple,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.lightbulb,
                    title: 'Insights',
                    value: '23',
                    color: Colors.amber,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.auto_fix_high,
                    title: 'Knowledge',
                    value: '89',
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.trending_up,
                    title: 'Accuracy',
                    value: '94%',
                    color: Colors.green,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Recent Patterns
            Text(
              'Recent Patterns',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),

            ...List.generate(5, (index) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.pattern,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  title: Text('Pattern ${index + 1}'),
                  subtitle: Text(
                    'Learned from ${10 + index * 5} conversations',
                    style: theme.textTheme.bodySmall,
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${85 + index}%',
                      style: TextStyle(
                        color: Colors.green.shade700,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Simple neural network visualization
class _NeuralNetworkPainter extends CustomPainter {
  final Color color;

  _NeuralNetworkPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withOpacity(0.3)
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    final nodePaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    // Draw layers
    const layers = [3, 5, 4, 2];
    final layerSpacing = size.width / (layers.length + 1);

    List<List<Offset>> nodePositions = [];

    for (int l = 0; l < layers.length; l++) {
      final x = layerSpacing * (l + 1);
      final nodeCount = layers[l];
      final nodeSpacing = size.height / (nodeCount + 1);

      List<Offset> positions = [];
      for (int n = 0; n < nodeCount; n++) {
        final y = nodeSpacing * (n + 1);
        positions.add(Offset(x, y));
      }
      nodePositions.add(positions);
    }

    // Draw connections
    for (int l = 0; l < nodePositions.length - 1; l++) {
      for (final from in nodePositions[l]) {
        for (final to in nodePositions[l + 1]) {
          canvas.drawLine(from, to, paint);
        }
      }
    }

    // Draw nodes
    for (final layer in nodePositions) {
      for (final pos in layer) {
        canvas.drawCircle(pos, 8, nodePaint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
