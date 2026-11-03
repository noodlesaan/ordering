# -*- coding: utf-8 -*-
"""Version-check script."""
import os
import sys
import codecs

Failed = 0
VERSION = "0.3"


SERVICE_WORKER_ITEMS = ["const CACHE_NAME = 'ordering-app-v{0}'"]
SERVICES_ITEMS = ['const APP_VERSION = "{0}"']

FILES = {
    "sw.js": SERVICE_WORKER_ITEMS,
    "services.js": SERVICES_ITEMS,
}

TEST_NUMBER = len(FILES)


def print_result(failed: bool = False) -> None:
    """
    Print final result.

    :param failed: failed flag
    """
    message = "Version tag tests "
    if not failed:
        print("\n" + message + "passed!")
    else:
        print("\n" + message + "failed!")
    print("Passed : " + str(TEST_NUMBER - Failed) + "/" + str(TEST_NUMBER))


if __name__ == "__main__":
    for file_name in FILES:
        try:
            file_content = codecs.open(
                file_name, "r", "utf-8", "ignore").read()
            for test_item in FILES[file_name]:
                if file_content.find(test_item.format(VERSION)) == -1:
                    print("Incorrect version tag in " + file_name)
                    Failed += 1
                    break
        except Exception as e:
            Failed += 1
            print("Error in " + file_name + "\n" + "Message : " + str(e))
    if Failed == 0:
        print_result(False)
        sys.exit(0)
    else:
        print_result(True)
        sys.exit(1)
