#ifndef CHARACTER_H
#define CHARACTER_H

/**
 * @brief Append a character to a string, assuming string points to an array
 * with enough space.
 *
 * @param string
 * @param character
 */
void character_append(char* string, char character);

/**
 * @brief Converts the character to uppercase.
 *
 * @param character
 * @return const char
 */
const char character_to_upper(const char character);

#endif