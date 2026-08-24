cmake_minimum_required(VERSION 3.20)
project(UIForger VERSION 1.2.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets)
find_package(Qt6 QUIET COMPONENTS Svg)

set(SOURCES
    src/main.cpp
    src/core/ir.cpp
    src/core/scene_store.cpp
    src/core/persistence.cpp
    src/canvas/canvas_view.cpp
    src/canvas/node_item.cpp
    src/canvas/mini_map.cpp
    src/ui/mainwindow.cpp
    src/ui/topbar.cpp
    src/ui/inspector.cpp
    src/ui/tree_panel.cpp
    src/export/exporters.cpp
)

set(HEADERS
    src/core/ir.h
    src/core/scene_store.h
    src/core/persistence.h
    src/canvas/canvas_view.h
    src/canvas/node_item.h
    src/canvas/mini_map.h
    src/ui/mainwindow.h
    src/ui/topbar.h
    src/ui/inspector.h
    src/ui/tree_panel.h
    src/export/exporters.h
)

add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
)

if(Qt6Svg_FOUND)
    target_link_libraries(${PROJECT_NAME} PRIVATE Qt6::Svg)
    target_compile_definitions(${PROJECT_NAME} PRIVATE HAVE_QT_SVG)
endif()

target_include_directories(${PROJECT_NAME} PRIVATE src)

# Install
install(TARGETS ${PROJECT_NAME} RUNTIME DESTINATION bin)
