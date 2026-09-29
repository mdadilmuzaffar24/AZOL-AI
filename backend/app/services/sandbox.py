import subprocess

def execute_python_sandbox(code: str, timeout: float = 15.0) -> dict:
    """
    Executes Python code inside a locked-down, ephemeral Docker container.
    Guarantees network isolation, restricted CPU/RAM usage, zero host file footprint,
    and automatic container destruction upon exit.
    """
    docker_cmd = [
        "docker", "run",
        "--rm",                   # Automatically destroy the container on exit
        "-i",                     # Keep stdin open to stream code directly
        "--network", "none",      # Block all outbound/inbound network traffic
        "--memory", "256m",       # Cap RAM to prevent OOM memory consumption attacks
        "--cpus", "0.5",          # Cap CPU allocation at half a core
        "--read-only",            # Enforce a read-only root filesystem
        "--tmpfs", "/tmp",        # Provide restricted in-memory scratch space
        "python:3.11-slim",
        "python", "-"             # Execute script directly from standard input (stdin)
    ]

    try:
        # Stream code directly into stdin with explicit UTF-8 encoding
        result = subprocess.run(
            docker_cmd,
            input=code,
            capture_output=True,
            text=True,
            encoding="utf-8",       # Force UTF-8 encoding for Windows compatibility
            errors="replace",      # Replace unmappable characters instead of throwing errors
            timeout=timeout
        )

        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Sandbox execution timed out after {timeout} seconds.",
            "exit_code": -1
        }
    except FileNotFoundError:
        return {
            "success": False,
            "stdout": "",
            "stderr": "Docker binary not found. Ensure Docker Desktop is installed and active.",
            "exit_code": -1
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Docker Sandbox execution error: {str(e)}",
            "exit_code": -1
        }