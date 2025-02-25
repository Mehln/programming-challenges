#include <stdio.h>
#include <stdlib.h>

#include "character.h"
#include "input.h"
#include "string.h"

int main() {
  char* string = input();
  string = string_trim(string, ' ');
  string = string_trim(string, '-');
  string = string_to_lowercase(string);
  string = string_slugify(string);
  printf("%s\n", string);
  free(string);
  return EXIT_SUCCESS;
}
