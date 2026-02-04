#!/usr/bin/env python3
"""
Flowchart CLI Module

Command-line interface for parsing, validating, and generating
implementation plans from flowchart files.

Usage:
    python -m flowchart.cli parse <file> [--format <format>] [--output <json|yaml>]
    python -m flowchart.cli validate <file>
    python -m flowchart.cli generate <file> --project-dir <path> [--spec-name <name>]
    python -m flowchart.cli plugins list
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def parse_command(args: argparse.Namespace) -> int:
    """Parse a flowchart file and output the TaskGraph."""
    from .parser import FlowchartParser

    try:
        parser = FlowchartParser()
        graph = parser.parse(args.file)

        # Output in requested format
        if args.output == "json":
            print(graph.to_json())
        else:
            # Default: pretty print summary
            print(f"Parsed flowchart: {args.file}")
            print(f"Nodes: {len(graph.nodes)}")
            print(f"Edges: {len(graph.edges)}")
            print()
            print("Nodes:")
            for node in graph.nodes:
                print(f"  - [{node.node_type.value}] {node.name} ({node.id})")
            print()
            print("Edges:")
            for edge in graph.edges:
                condition = f" [{edge.condition}]" if edge.condition else ""
                print(f"  - {edge.source_id} -> {edge.target_id}{condition}")

        return 0

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error parsing flowchart: {e}", file=sys.stderr)
        return 1


def validate_command(args: argparse.Namespace) -> int:
    """Validate a flowchart file."""
    from .parser import FlowchartParser
    from .validator import FlowchartValidator

    try:
        # Parse the file
        parser = FlowchartParser()
        graph = parser.parse(args.file)

        # Validate
        validator = FlowchartValidator()
        result = validator.validate(graph)

        # Output results
        if args.output == "json":
            print(json.dumps(result.to_dict(), indent=2))
        else:
            if result.valid:
                print(f"✓ Flowchart is valid: {args.file}")
            else:
                print(f"✗ Flowchart has errors: {args.file}")

            if result.errors:
                print()
                print("Errors:")
                for error in result.errors:
                    node_info = f" (node: {error.node_id})" if error.node_id else ""
                    print(f"  ✗ [{error.code}] {error.message}{node_info}")

            if result.warnings:
                print()
                print("Warnings:")
                for warning in result.warnings:
                    node_info = f" (node: {warning.node_id})" if warning.node_id else ""
                    print(f"  ⚠ [{warning.code}] {warning.message}{node_info}")

        return 0 if result.valid else 1

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error validating flowchart: {e}", file=sys.stderr)
        return 1


def generate_command(args: argparse.Namespace) -> int:
    """Generate implementation plan from a flowchart file."""
    from .generator import PlanGenerator
    from .parser import FlowchartParser
    from .validator import FlowchartValidator

    try:
        # Parse the file
        parser = FlowchartParser()
        graph = parser.parse(args.file)

        # Validate first
        validator = FlowchartValidator()
        result = validator.validate(graph)

        if not result.valid and not args.force:
            print("Error: Flowchart has validation errors:", file=sys.stderr)
            for error in result.errors:
                print(f"  - {error.message}", file=sys.stderr)
            print("\nUse --force to generate anyway.", file=sys.stderr)
            return 1

        # Generate plan
        generator = PlanGenerator()

        # Determine spec directory
        project_dir = Path(args.project_dir)
        if not project_dir.exists():
            print(f"Error: Project directory does not exist: {project_dir}", file=sys.stderr)
            return 1

        specs_dir = project_dir / ".auto-claude" / "specs"

        # Find next spec number
        spec_num = 1
        if specs_dir.exists():
            existing = [d.name for d in specs_dir.iterdir() if d.is_dir()]
            numbers = []
            for name in existing:
                if name[:3].isdigit():
                    numbers.append(int(name[:3]))
            if numbers:
                spec_num = max(numbers) + 1

        # Create spec name
        spec_name = args.spec_name or graph.metadata.get("name", "flowchart-import")
        spec_name = spec_name.lower().replace(" ", "-")
        spec_dir_name = f"{spec_num:03d}-{spec_name}"
        spec_dir = specs_dir / spec_dir_name

        # Generate and save
        feature_name = args.spec_name or graph.metadata.get("name", "Flowchart Import")
        saved_files = generator.save_to_spec_dir(
            graph,
            spec_dir,
            feature_name=feature_name,
            workflow_type=args.workflow_type,
        )

        if args.output == "json":
            output = {
                "success": True,
                "spec_dir": str(spec_dir),
                "spec_number": f"{spec_num:03d}",
                "files": {k: str(v) for k, v in saved_files.items()},
            }
            print(json.dumps(output, indent=2))
        else:
            print(f"✓ Generated spec in: {spec_dir}")
            print()
            print("Created files:")
            for name, path in saved_files.items():
                print(f"  - {name}: {path.name}")
            print()
            print(f"To build this spec, run:")
            print(f"  python run.py --spec {spec_num:03d}")

        return 0

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error generating plan: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


def plugins_command(args: argparse.Namespace) -> int:
    """List available plugins."""
    from .parser import FlowchartParser

    try:
        parser = FlowchartParser()

        if args.output == "json":
            plugins = []
            for name, adapter in parser._adapters.items():
                plugins.append({
                    "name": name,
                    "class": adapter.__class__.__name__,
                    "formats": list(parser.SUPPORTED_FORMATS.keys()),
                })
            print(json.dumps(plugins, indent=2))
        else:
            print("Available flowchart plugins:")
            print()
            for name, adapter in parser._adapters.items():
                print(f"  {name}")
                print(f"    Class: {adapter.__class__.__name__}")
                formats = [k for k, v in parser.SUPPORTED_FORMATS.items() if v == name]
                print(f"    Formats: {', '.join(formats)}")
                print()

        return 0

    except Exception as e:
        print(f"Error listing plugins: {e}", file=sys.stderr)
        return 1


def main(argv: list[str] | None = None) -> int:
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        prog="flowchart",
        description="Parse flowcharts and generate Auto-Claude implementation plans",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Parse command
    parse_parser = subparsers.add_parser(
        "parse",
        help="Parse a flowchart file and output TaskGraph",
    )
    parse_parser.add_argument("file", type=Path, help="Path to flowchart file")
    parse_parser.add_argument(
        "--format",
        choices=["lucidchart", "drawio"],
        default="lucidchart",
        help="Flowchart format (default: auto-detect)",
    )
    parse_parser.add_argument(
        "--output",
        "-o",
        choices=["json", "summary"],
        default="summary",
        help="Output format",
    )

    # Validate command
    validate_parser = subparsers.add_parser(
        "validate",
        help="Validate a flowchart file",
    )
    validate_parser.add_argument("file", type=Path, help="Path to flowchart file")
    validate_parser.add_argument(
        "--output",
        "-o",
        choices=["json", "text"],
        default="text",
        help="Output format",
    )

    # Generate command
    generate_parser = subparsers.add_parser(
        "generate",
        help="Generate implementation plan from flowchart",
    )
    generate_parser.add_argument("file", type=Path, help="Path to flowchart file")
    generate_parser.add_argument(
        "--project-dir",
        "-p",
        type=Path,
        required=True,
        help="Path to project directory",
    )
    generate_parser.add_argument(
        "--spec-name",
        "-n",
        help="Name for the spec (default: from flowchart)",
    )
    generate_parser.add_argument(
        "--workflow-type",
        "-w",
        choices=["feature", "refactor", "investigation", "migration", "simple"],
        default="feature",
        help="Workflow type (default: feature)",
    )
    generate_parser.add_argument(
        "--output",
        "-o",
        choices=["json", "text"],
        default="text",
        help="Output format",
    )
    generate_parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Generate even if validation fails",
    )

    # Plugins command
    plugins_parser = subparsers.add_parser(
        "plugins",
        help="List available plugins",
    )
    plugins_parser.add_argument(
        "--output",
        "-o",
        choices=["json", "text"],
        default="text",
        help="Output format",
    )

    args = parser.parse_args(argv)

    if not args.command:
        parser.print_help()
        return 1

    # Dispatch to command handler
    if args.command == "parse":
        return parse_command(args)
    elif args.command == "validate":
        return validate_command(args)
    elif args.command == "generate":
        return generate_command(args)
    elif args.command == "plugins":
        return plugins_command(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
