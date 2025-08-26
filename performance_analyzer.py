#!/usr/bin/env python3
"""
AI Translation Tool - Consolidated Performance Analyzer
Comprehensive BLEU score calculation and performance analysis
Supports any CSV file with translation results
"""

import csv
import re
import math
import statistics
from collections import Counter
import sys

def tokenize(text):
    """Clean and tokenize text for BLEU calculation"""
    # Remove markdown links but keep the text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove extra whitespace and convert to lowercase
    text = re.sub(r'\s+', ' ', text.strip())
    return text.lower().split()

def ngrams(tokens, n):
    """Generate n-grams from tokens"""
    return [tuple(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]

def calculate_bleu(candidate, reference, max_n=4):
    """Calculate BLEU score between candidate and reference translations"""
    if not candidate.strip() or not reference.strip():
        return 0.0
    
    ref_tokens = tokenize(reference)
    cand_tokens = tokenize(candidate)
    
    if not ref_tokens or not cand_tokens:
        return 0.0
    
    # Brevity penalty
    ref_len = len(ref_tokens)
    cand_len = len(cand_tokens)
    
    if cand_len > ref_len:
        bp = 1.0
    else:
        bp = math.exp(1 - ref_len / cand_len) if cand_len > 0 else 0.0
    
    # Calculate precision for n-grams (1 to max_n)
    precisions = []
    for n in range(1, max_n + 1):
        ref_ngrams = Counter(ngrams(ref_tokens, n))
        cand_ngrams = Counter(ngrams(cand_tokens, n))
        
        if not cand_ngrams:
            precisions.append(0.0)
            continue
        
        overlap = 0
        for ngram in cand_ngrams:
            overlap += min(cand_ngrams[ngram], ref_ngrams.get(ngram, 0))
        
        precision = overlap / sum(cand_ngrams.values())
        precisions.append(precision)
    
    # Geometric mean of precisions
    if all(p > 0 for p in precisions):
        geo_mean = math.exp(sum(math.log(p) for p in precisions) / len(precisions))
    else:
        geo_mean = 0.0
    
    return bp * geo_mean

def analyze_csv_file(filename, reference_model='GPT-4.1'):
    """Analyze translation performance from CSV file"""
    
    print(f"🔍 ANALYZING: {filename}")
    print("=" * 60)
    
    results = {}
    
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            # Get model columns
            model_columns = [col for col in reader.fieldnames if col.startswith('Spanish-')]
            latency_columns = [col for col in reader.fieldnames if col.startswith('Latency-')]
            
            reference_col = f'Spanish-{reference_model}'
            
            # Initialize results for each model
            for col in model_columns:
                model_name = col.replace('Spanish-', '')
                if model_name != reference_model:
                    results[model_name] = {
                        'bleu_scores': [],
                        'latencies': [],
                        'failures': 0,
                        'total_tests': 0
                    }
            
            # Process each row
            for row in reader:
                reference_text = row[reference_col]
                
                for col in model_columns:
                    model_name = col.replace('Spanish-', '')
                    if model_name == reference_model:
                        continue
                    
                    candidate_text = row[col]
                    latency_col = f'Latency-{model_name} (ms)'
                    latency_str = row.get(latency_col, '0')
                    
                    try:
                        latency = float(latency_str)
                    except ValueError:
                        latency = 0
                    
                    results[model_name]['total_tests'] += 1
                    
                    # Check for failures
                    if ('Mock]' in candidate_text or 
                        'API call failed' in candidate_text or 
                        'Translation truncated' in candidate_text or
                        candidate_text.strip() == '' or
                        latency == 0):
                        results[model_name]['failures'] += 1
                    else:
                        # Calculate BLEU score
                        bleu = calculate_bleu(candidate_text, reference_text)
                        results[model_name]['bleu_scores'].append(bleu)
                        results[model_name]['latencies'].append(latency)
        
        return results
        
    except FileNotFoundError:
        print(f"❌ Error: Could not find {filename}")
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def print_performance_report(results, filename):
    """Print comprehensive performance analysis"""
    
    if not results:
        return
    
    print(f"\n📊 PERFORMANCE ANALYSIS REPORT")
    print("-" * 60)
    
    # Calculate statistics for each model
    model_stats = {}
    working_models = []
    partial_models = []
    failed_models = []
    
    for model, data in results.items():
        success_count = len(data['bleu_scores'])
        total_count = data['total_tests']
        success_rate = (success_count / total_count * 100) if total_count > 0 else 0
        
        if success_count > 0:
            avg_bleu = statistics.mean(data['bleu_scores'])
            avg_latency = statistics.mean(data['latencies'])
            efficiency = avg_bleu / (avg_latency / 1000) if avg_latency > 0 else 0
        else:
            avg_bleu = 0.0
            avg_latency = 0.0
            efficiency = 0.0
        
        model_stats[model] = {
            'avg_bleu': avg_bleu,
            'avg_latency': avg_latency,
            'success_rate': success_rate,
            'efficiency': efficiency,
            'success_count': success_count,
            'total_count': total_count
        }
        
        # Categorize models
        if success_rate == 100:
            working_models.append((model, avg_latency))
        elif success_rate > 0:
            partial_models.append((model, data['failures']))
        else:
            failed_models.append(model)
    
    # Print summary table
    print(f"{'Model':<25} {'BLEU':<8} {'Latency':<10} {'Success%':<9} {'Efficiency':<10}")
    print("-" * 70)
    
    # Sort by efficiency for display
    sorted_models = sorted(model_stats.items(), key=lambda x: x[1]['efficiency'], reverse=True)
    
    for model, stats in sorted_models:
        status = "✅" if stats['success_rate'] == 100 else "⚠️" if stats['success_rate'] > 0 else "❌"
        print(f"{model:<25} {stats['avg_bleu']:<8.4f} {stats['avg_latency']:<10.0f}ms {stats['success_rate']:<8.1f}% {stats['efficiency']:<10.4f} {status}")
    
    # Performance categories
    print(f"\n🎯 PERFORMANCE CATEGORIES:")
    print("-" * 60)
    
    print(f"✅ Fully Working: {len(working_models)} models")
    if working_models:
        working_models.sort(key=lambda x: x[1])  # Sort by latency
        for rank, (model, latency) in enumerate(working_models, 1):
            emoji = "⚡" if latency < 1000 else "🚀" if latency < 2000 else "🐌"
            print(f"   {rank}. {emoji} {model}: {latency:.0f}ms")
    
    print(f"⚠️  Partially Working: {len(partial_models)} models")
    for model, failures in partial_models:
        print(f"   • {model}: {failures} failures")
    
    print(f"❌ Failed: {len(failed_models)} models")
    for model in failed_models:
        print(f"   • {model}: No successful translations")
    
    # Overall assessment
    operational_rate = len(working_models) / len(results) * 100
    print(f"\n💡 OVERALL ASSESSMENT:")
    print("-" * 60)
    print(f"📊 Operational Rate: {operational_rate:.1f}% ({len(working_models)}/{len(results)})")
    
    if working_models:
        fastest = min(working_models, key=lambda x: x[1])
        slowest = max(working_models, key=lambda x: x[1])
        avg_latency = statistics.mean([l for _, l in working_models])
        
        print(f"⚡ Fastest: {fastest[0]} ({fastest[1]:.0f}ms)")
        print(f"🐌 Slowest: {slowest[0]} ({slowest[1]:.0f}ms)")
        print(f"📊 Average Latency: {avg_latency:.0f}ms")

def main():
    """Main function - analyze specified CSV file or latest version"""
    
    if len(sys.argv) > 1:
        filename = sys.argv[1]
    else:
        # Default to latest file
        filename = 'properdata_translated (11).csv'
    
    print("🚀 AI Translation Tool - Performance Analyzer")
    print("=" * 60)
    
    results = analyze_csv_file(filename)
    if results:
        print_performance_report(results, filename)
        print(f"\n✅ Analysis complete for {filename}")

if __name__ == "__main__":
    main()